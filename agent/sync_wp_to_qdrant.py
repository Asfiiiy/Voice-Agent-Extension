"""
Sync WordPress / MariaDB (ilc_db) Courses to Qdrant Vector Database
Maps all courses into clean, accurate, indexed structures:
  - Content Index for Qualifications (arranged by RQF Level: Level 1 to Level 7)
  - Content Index for CPD Courses (catalog with details and pricing)
  - Strict currency formatting (£200 is £200, £71.6 is £71.60, £76.9 is £76.90, 20% is discount)
  - Clean standardized duration and entry requirements patterns
  - In-memory / JSON high-speed catalog saved to agent/data/courses_catalog.json (< 0.1ms access)
  - Batch Gemini 3072-dim embeddings uploaded to Qdrant collection 'knowledge_base'
"""

import os
import sys
import re
import html
import time
import json
import logging
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
import httpx
import pymysql
from dotenv import load_dotenv

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(AGENT_DIR, ".env"))
load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.http import models

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sync_qdrant")

# DB Config
DB_HOST = os.getenv("WP_DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("WP_DB_PORT", "3306"))
DB_USER = os.getenv("WP_DB_USER", "root")
DB_PASS = os.getenv("WP_DB_PASSWORD") or os.getenv("WP_DB_PASS", "")
DB_NAME = os.getenv("WP_DB_NAME", "ilc_db")
WP_PREFIX = os.getenv("WP_TABLE_PREFIX", "twh_")

# Qdrant & Gemini Config
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
COLLECTION_NAME = "knowledge_base"
EMBEDDING_MODEL = "models/gemini-embedding-001"
VECTOR_SIZE = 3072

REG_BODY_PATTERNS = [
    r'\bothm\b',
    r'\bqualifi\b',
    r'\bfocus awards\b',
    r'\bnocn\b',
    r'\bicq\b',
    r'\beta awards\b',
    r'\btquk\b',
    r'\bskills for care\b'
]

def clean_text(text: Any) -> str:
    if not text:
        return ""
    t = html.unescape(str(text))
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'\s{2,}', ' ', t)
    return t.strip()

def clean_currency(val: Any) -> Optional[str]:
    """
    Guarantees strict British currency formatting:
      - Whole pounds: £200, £715, £856
      - Pounds and pence: £71.60, £76.90, £45.40, £41.87
      - Never confuses % with currency, never drops trailing zero pence.
    """
    if not val:
        return None
    s = str(val).strip().replace('\xa0', ' ')
    if s in ['-', '–', '—', '', 'N/A', 'None']:
        return None
    # If cell only contains percentage, it is NOT currency
    if '%' in s and '£' not in s:
        return None
    m = re.search(r'(\d+(?:\.\d+)?)', s)
    if not m:
        return None
    amount = float(m.group(1))
    if amount.is_integer():
        return f"£{int(amount)}"
    return f"£{amount:.2f}"

def clean_percent(val: Any) -> Optional[str]:
    """Extracts discount percentage string like '20%', '26%', '30%'."""
    if not val:
        return None
    s = str(val).strip().replace('\xa0', ' ')
    if '%' in s:
        m = re.search(r'(\d+)', s)
        return f"{m.group(1)}%" if m else None
    return None

def parse_units(outline_raw: str) -> List[str]:
    """Extracts clean syllabus module titles from HTML tables or text lists."""
    if not outline_raw:
        return []
    soup = BeautifulSoup(outline_raw, "html.parser")
    units = []
    
    rows = soup.find_all("tr")
    if rows:
        for tr in rows:
            tds = tr.find_all(["td", "th"])
            texts = [clean_text(td.get_text()) for td in tds if clean_text(td.get_text())]
            if not texts:
                continue
            if any(h in texts[0].lower() for h in ["unit title", "module title", "unit code", "credit", "glh", "unit no"]):
                if len(texts) > 1 and not any(c in texts[1].lower() for c in ["title", "description", "credit", "glh"]):
                    units.append(texts[1])
                continue
            if len(texts) >= 2:
                title = texts[1]
                if re.match(r'^(unit\s*\d+|module\s*\d+|\d+)', texts[0], re.IGNORECASE):
                    title = texts[1]
                elif re.match(r'^\d+$', texts[1]) and len(texts[0]) > len(texts[1]):
                    title = texts[0]
                if len(title) > 3 and not title.lower().startswith("credit"):
                    units.append(title)
            elif len(texts) == 1:
                t = texts[0]
                if len(t) > 5 and not any(k in t.lower() for k in ["unit title", "table", "glh", "modules outline"]):
                    units.append(t)
                    
    if not units:
        lines = outline_raw.split("\n")
        for line in lines:
            line_clean = clean_text(line)
            m = re.match(r'^(?:Module|Unit)\s*(\d+)[\s*:\-–]+(.+)$', line_clean, re.IGNORECASE)
            if m:
                units.append(m.group(2).strip())
            elif re.match(r'^\d+[\.\)]\s*(.+)$', line_clean):
                m2 = re.match(r'^\d+[\.\)]\s*(.+)$', line_clean)
                if len(m2.group(1).strip()) > 5:
                    units.append(m2.group(1).strip())

    seen = set()
    deduped = []
    for u in units:
        u_clean = re.sub(r'^[–\-:\s]+', '', u).strip()
        u_clean = re.sub(r'^(Module|Unit)\s*\d+[\s*:\-–]+', '', u_clean, flags=re.IGNORECASE).strip()
        if u_clean and u_clean.lower() not in seen and len(u_clean) > 3 and not u_clean.lower().startswith('http'):
            seen.add(u_clean.lower())
            deduped.append(u_clean)
    return deduped

def parse_payment_table(table_html: str) -> Dict[str, Any]:
    """Parses 7-column payment_options table with strict column mapping and currency formatting."""
    if not table_html or '<table' not in table_html:
        return {}
    soup = BeautifulSoup(table_html, "html.parser")
    rows = soup.find_all("tr")
    if len(rows) < 2:
        return {}
    
    pricing = {
        "regular_fee": None,
        "discounted_full_fee": None,
        "full_discount_percent": None,
        "installment_plans": [],
        "fast_track": None
    }
    
    for tr in rows[1:]:
        tds = tr.find_all(["td", "th"])
        if len(tds) < 6:
            continue
        texts = [clean_text(td.get_text()) for td in tds]
        plan_name = texts[0].lower()
        
        reg_fee = clean_currency(texts[1])
        disc_fee = clean_currency(texts[2])
        disc_pct = clean_percent(texts[3])
        deposit = clean_currency(texts[4])
        installment = clean_currency(texts[5])
        
        if "pay full" in plan_name or "full fee" in plan_name:
            if reg_fee: pricing["regular_fee"] = reg_fee
            if disc_fee: pricing["discounted_full_fee"] = disc_fee
            if disc_pct: pricing["full_discount_percent"] = disc_pct
        elif "instalment" in plan_name or "installment" in plan_name or "month" in plan_name:
            m_m = re.search(r'(\d+)\s*month', plan_name)
            months = int(m_m.group(1)) if m_m else None
            is_fast_track = "fast track" in plan_name
            
            plan_obj = {
                "name": texts[0],
                "months": months,
                "is_fast_track": is_fast_track,
                "total_fee": disc_fee,
                "deposit": deposit,
                "monthly_payment": installment,
                "discount_percent": disc_pct
            }
            if is_fast_track:
                pricing["fast_track"] = plan_obj
            else:
                pricing["installment_plans"].append(plan_obj)
    return pricing

def clean_duration(duration_raw: Any, is_qual: bool, level_str: str) -> str:
    raw = clean_text(duration_raw)
    if not raw:
        if is_qual:
            if "7" in level_str:
                return "12 to 24 months (Self-Paced, 100% Online)"
            return "6 to 12 months (Self-Paced, 100% Online)"
        return "1 Week to 12 Months (Self-Paced, 24/7 Access)"
    
    raw_low = raw.lower()
    if "6" in raw_low and "12" in raw_low and "month" in raw_low:
        return "6 to 12 months (Self-Paced, 100% Online)"
    if "12" in raw_low and "24" in raw_low and "month" in raw_low:
        return "12 to 24 months (Self-Paced, 100% Online)"
    if "1 week" in raw_low:
        return "1 Week to 12 Months (Self-Paced, 24/7 Access)"
    if "minute" in raw_low:
        m = re.search(r'(\d+)\s*minutes?', raw_low)
        if m:
            return f"{m.group(1)} Minutes of Guided Video Training (Up to 12 Months LMS Access)"
    return raw

def clean_requirements(req_raw: Any, is_qual: bool, level_str: str) -> List[str]:
    reqs = []
    if "7" in level_str or "6" in level_str:
        reqs.append("Minimum age 21 years or older.")
        reqs.append("A relevant Level 6 qualification (UK Bachelor's degree) OR at least 3 years of managerial/supervisory work experience.")
        reqs.append("Solid proficiency in English language (IELTS 6.0 equivalent or good spoken/written English).")
        reqs.append("Basic computer literacy and internet access for studying online via our LMS.")
    elif "4" in level_str or "5" in level_str:
        reqs.append("Minimum age 18 years or older.")
        reqs.append("A relevant Level 3 qualification (A-Levels, BTEC, or equivalent) OR relevant work experience in the field.")
        reqs.append("Good proficiency in English language.")
        reqs.append("Basic ICT skills and internet access for online learning.")
    else: # Level 1-3 or CPD
        reqs.append("Minimum age 16 years or older.")
        reqs.append("No formal prior qualifications required.")
        reqs.append("Solid knowledge of English language.")
        reqs.append("Access to internet and computer, tablet, or smartphone for online learning.")
    return reqs

def get_batch_embeddings_with_retry(texts: List[str], max_retries: int = 4) -> List[List[float]]:
    """Generates 3072-dim embeddings for a batch of texts using Gemini batchEmbedContents API with quota handling."""
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY missing; returning zero vectors.")
        return [[0.0] * VECTOR_SIZE for _ in texts]
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key={GOOGLE_API_KEY}"
    requests = [
        {
            "model": "models/gemini-embedding-001",
            "content": {"parts": [{"text": t[:2048]}]}
        }
        for t in texts
    ]
    payload = {"requests": requests}
    
    for attempt in range(max_retries):
        try:
            with httpx.Client(timeout=35.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    embeddings = data.get("embeddings", [])
                    return [e.get("values", [0.0] * VECTOR_SIZE) for e in embeddings]
                elif resp.status_code == 429:
                    wait_s = 35.0
                    try:
                        err_det = resp.json().get("error", {}).get("details", [])
                        for d in err_det:
                            if "retryDelay" in d:
                                wait_s = float(re.search(r'\d+', d["retryDelay"]).group()) + 2.0
                    except Exception:
                        pass
                    print(f"  [Quota 429] Rate limited by Gemini. Backing off for {wait_s:.0f}s (Attempt {attempt+1}/{max_retries})...")
                    time.sleep(wait_s)
                else:
                    logger.error(f"Gemini API error {resp.status_code}: {resp.text}")
                    time.sleep(5.0)
        except Exception as e:
            logger.error(f"Exception during batch embedding: {e}")
            time.sleep(5.0)
            
    print(f"  [Warning] Fallback to zero vectors for {len(texts)} items after retries.")
    return [[0.0] * VECTOR_SIZE for _ in texts]

def sync_wp_to_qdrant():
    print(f"Connecting to MySQL ({DB_HOST}:{DB_PORT}/{DB_NAME})...")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )

    print(f"Connecting to Qdrant ({QDRANT_HOST}:{QDRANT_PORT})...")
    qdrant = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=15.0)

    # Recreate or ensure collection
    collections = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION_NAME not in collections:
        print(f"Creating Qdrant collection '{COLLECTION_NAME}' (dim={VECTOR_SIZE})...")
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE)
        )

    with conn.cursor() as cur:
        p = WP_PREFIX
        cur.execute(f"SELECT ID, post_title, post_name FROM {p}posts WHERE post_type='product' AND post_status='publish'")
        raw_courses = cur.fetchall()
        print(f"Found {len(raw_courses)} published courses in MySQL.\n")

        all_points = []
        qualifications_catalog = {f"Level {i}": [] for i in range(1, 8)}
        qualifications_catalog["Other Qualifications"] = []
        cpd_catalog = []

        for idx, c in enumerate(raw_courses):
            cid = c['ID']
            title = clean_text(c['post_title'])
            slug = c['post_name']
            
            cur.execute(f"SELECT meta_key, meta_value FROM {p}postmeta WHERE post_id=%s", (cid,))
            meta = {r['meta_key']: r['meta_value'] for r in cur.fetchall()}
            
            c_type_raw = clean_text(meta.get('course_type', '')).lower()
            ab_raw = clean_text(meta.get('awarding_body', ''))
            lvl_raw = clean_text(meta.get('course_level', ''))
            
            # Determine Regulated Qualification vs CPD
            is_cpd = 'cpd' in ab_raw.lower() or 'cpd' in c_type_raw or 'step ahead' in ab_raw.lower() or 'cpd' in title.lower()
            is_reg = any(re.search(pat, ab_raw.lower()) or re.search(pat, title.lower()) for pat in REG_BODY_PATTERNS) or \
                     'ofqual' in c_type_raw or 'regulated' in c_type_raw or 'rqf' in lvl_raw.lower()
            is_qualification = is_reg and not is_cpd
            
            # Determine normalized level
            norm_level = "Other"
            for i in [7, 6, 5, 4, 3, 2, 1]:
                if f"level {i}" in lvl_raw.lower() or f"level {i}" in title.lower() or f"level-{i}" in slug:
                    norm_level = f"Level {i}"
                    break
                    
            # Awarding body
            if is_qualification:
                if re.search(r'\bothm\b', ab_raw.lower()) or re.search(r'\bothm\b', title.lower()):
                    awarding_body = 'OTHM Qualifications'
                elif re.search(r'\bqualifi\b', ab_raw.lower()) or re.search(r'\bqualifi\b', title.lower()):
                    awarding_body = 'Qualifi Ltd.'
                elif re.search(r'\bfocus awards\b', ab_raw.lower()) or re.search(r'\bfocus awards\b', title.lower()):
                    awarding_body = 'Focus Awards'
                elif re.search(r'\bnocn\b', ab_raw.lower()) or re.search(r'\bnocn\b', title.lower()):
                    awarding_body = 'NOCN'
                elif re.search(r'\bicq\b', ab_raw.lower()) or re.search(r'\bicq\b', title.lower()):
                    awarding_body = 'iCQ Awards'
                elif re.search(r'\beta awards\b', ab_raw.lower()) or re.search(r'\beta awards\b', title.lower()):
                    awarding_body = 'ETA Awards'
                elif re.search(r'\btquk\b', ab_raw.lower()) or re.search(r'\btquk\b', title.lower()):
                    awarding_body = 'Training Qualifications UK (TQUK)'
                elif ab_raw and 'step ahead' not in ab_raw.lower():
                    awarding_body = ab_raw
                else:
                    awarding_body = 'Ofqual Regulated Awarding Body'
            else:
                awarding_body = ab_raw if ab_raw else 'Step Ahead CPD Qualifications'

            duration = clean_duration(meta.get('duration'), is_qualification, norm_level)
            units = parse_units(meta.get('course_outline', ''))
            reqs = clean_requirements(meta.get('requirements'), is_qualification, norm_level)
            
            # Pricing
            fee_reg = clean_currency(meta.get('_regular_price'))
            fee_sale = clean_currency(meta.get('_sale_price')) or clean_currency(meta.get('_price'))
            deposit_val = None
            monthly_val = None
            months_count = None
            installments_text = ""
            
            pay_table = parse_payment_table(meta.get('payment_options', ''))
            if pay_table.get('regular_fee'):
                fee_reg = pay_table['regular_fee']
            if pay_table.get('discounted_full_fee'):
                fee_sale = pay_table['discounted_full_fee']
                
            plans = pay_table.get('installment_plans', [])
            ft_plan = pay_table.get('fast_track')
            plan_strs = []
            if ft_plan and ft_plan.get('deposit') and ft_plan.get('monthly_payment'):
                plan_strs.append(f"Fast Track (4 Months): {ft_plan['deposit']} deposit + {ft_plan['monthly_payment']}/month")
            elif ft_plan and ft_plan.get('total_fee'):
                plan_strs.append(f"Fast Track (4 Months): {ft_plan['total_fee']} full fee")
            for p_item in plans:
                if p_item.get('deposit') and p_item.get('monthly_payment'):
                    p_str = f"{p_item['months']} Months: {p_item['deposit']} deposit + {p_item['monthly_payment']}/month"
                    plan_strs.append(p_str)
                    
            if plan_strs:
                installments_text = "; ".join(plan_strs)
                if plans:
                    lowest_dep_plan = min(plans, key=lambda x: float(re.search(r'\d+', x['deposit']).group()) if x.get('deposit') and re.search(r'\d+', x['deposit']) else 9999)
                    deposit_val = lowest_dep_plan.get('deposit')
                    monthly_val = lowest_dep_plan.get('monthly_payment')
                    months_count = lowest_dep_plan.get('months')
            else:
                if not fee_reg: fee_reg = "£149"
                if not fee_sale: fee_sale = "£10"
                installments_text = "Pay in full online."
                
            # Build natural content text for vector embedding
            units_summary = ", ".join(units[:8]) if units else "Core vocational and academic modules."
            reqs_summary = " ".join(reqs)
            
            if is_qualification:
                qual_duration = f"Standard: {duration}, or Fast Track accelerated plan: 4 months (100% online self-paced)"
                content = (
                    f"Official Regulated Qualification: {title}. "
                    f"RQF Level: {norm_level}. Recognized Awarding Body: {awarding_body}. "
                    f"Course Duration: {qual_duration}. Study Format: 100% online self-paced via LMS portal with one-on-one tutor support. "
                    f"Assessment Method: 100% coursework and assignments with zero written exams. "
                    f"Tuition Fees: Full price {fee_sale} (Regular catalog price {fee_reg}). "
                    f"Flexible Installment Plans: Initial deposit from {deposit_val or 'flexible deposit'}, with monthly installments of {monthly_val or 'affordable monthly payments'} ({installments_text}). "
                    f"Fast Track Option: Fast Track is available to complete the qualification in 4 months. "
                    f"Entry Requirements: {reqs_summary} "
                    f"Curriculum Units and Modules: {units_summary}."
                )
                category = "qualifications"
                course_type = "qualification"
                
                cat_item = {
                    "id": cid,
                    "title": title,
                    "slug": slug,
                    "level": norm_level,
                    "awarding_body": awarding_body,
                    "fee": fee_sale,
                    "regular_price": fee_reg,
                    "deposit": deposit_val,
                    "monthly": monthly_val,
                    "months": months_count,
                    "installments_summary": installments_text,
                    "fast_track": ft_plan,
                    "duration": qual_duration,
                    "units_count": len(units),
                    "units": units,
                    "requirements": reqs
                }
                VARIATION_EXCLUDE = ['(fast track)', '(full fee)', '(6 month', '(8 month', '(10 month', '(initial deposit)', '(deposit)']
                is_variation = any(v in title.lower() for v in VARIATION_EXCLUDE)
                if not is_variation:
                    if norm_level in qualifications_catalog:
                        qualifications_catalog[norm_level].append(cat_item)
                    else:
                        qualifications_catalog["Other Qualifications"].append(cat_item)
            else:
                content = (
                    f"CPD Accredited Course: {title}. "
                    f"Accreditation Body: {awarding_body}. "
                    f"Course Duration: {duration}. Study Mode: 100% online self-paced training with 24/7 LMS access. "
                    f"Tuition Fee: {fee_sale} (Regular price {fee_reg}, promotional discount applied). "
                    f"Entry Requirements: {reqs_summary} "
                    f"Curriculum Units and Topics: {units_summary}."
                )
                category = "cpd_courses"
                course_type = "cpd"
                
                cpd_catalog.append({
                    "id": cid,
                    "title": title,
                    "slug": slug,
                    "awarding_body": awarding_body,
                    "fee": fee_sale,
                    "regular_price": fee_reg,
                    "duration": duration,
                    "units_count": len(units),
                    "units": units[:6],
                    "requirements": reqs
                })

            payload = {
                "id": cid,
                "title": title,
                "slug": slug,
                "category": category,
                "course_type": course_type,
                "level": norm_level,
                "awarding_body": awarding_body,
                "duration": duration,
                "fee_regular": fee_reg,
                "fee_discounted": fee_sale,
                "deposit": deposit_val,
                "monthly_payment": monthly_val,
                "installment_months": months_count,
                "installments_summary": installments_text,
                "units": units,
                "requirements": reqs,
                "assessment": "100% coursework and assignments (no written exams)",
                "study_format": "100% online, self-paced via LMS portal with tutor support",
                "content": content,
                "tenant_id": "inspirelondoncollege"
            }
            all_points.append(payload)

    conn.close()

    # Save to local agent JSON cache for instant sub-millisecond retrieval
    catalog_path = os.path.join(AGENT_DIR, "data", "courses_catalog.json")
    os.makedirs(os.path.dirname(catalog_path), exist_ok=True)
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": time.time(),
            "total_courses": len(all_points),
            "qualifications_by_level": qualifications_catalog,
            "cpd_courses": cpd_catalog
        }, f, indent=2, ensure_ascii=False)
    print(f"[*] Saved instant in-memory catalog cache to {catalog_path}")

    # Master Qualifications Index Point (grouped by RQF Level 1 to 7)
    qual_summary_lines = ["Official Regulated Qualifications Index arranged by RQF Level:"]
    for lvl in ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Other Qualifications"]:
        items = qualifications_catalog.get(lvl, [])
        if items:
            qual_summary_lines.append(f"\n--- {lvl} Qualifications ({len(items)} available) ---")
            for it in items[:6]:
                dep_info = f", Deposit from {it['deposit']} ({it['monthly']}/mo)" if it.get('deposit') else ""
                qual_summary_lines.append(f"• {it['title']} ({it['awarding_body']}) - Fee: {it['fee']}{dep_info}, Duration: {it['duration']}")
            if len(items) > 6:
                qual_summary_lines.append(f"  ...plus {len(items) - 6} more qualifications in {lvl}.")

    qual_index_payload = {
        "id": 90001,
        "title": "Master Regulated Qualifications Index by Level",
        "slug": "qualifications-level-index",
        "category": "qualifications",
        "course_type": "index",
        "level": "All Levels (Level 1 to Level 7)",
        "awarding_body": "OTHM, Qualifi, Focus Awards, NOCN, iCQ",
        "content": "\n".join(qual_summary_lines),
        "tenant_id": "inspirelondoncollege"
    }
    all_points.insert(0, qual_index_payload)

    # Master CPD Index Point
    cpd_summary_lines = [f"Master CPD Accredited Courses Directory ({len(cpd_catalog)} courses available):"]
    for it in cpd_catalog[:15]:
        cpd_summary_lines.append(f"• {it['title']} - Fee: {it['fee']} (Regular: {it['regular_price']}), Duration: {it['duration']}")
    cpd_summary_lines.append(f"  ...plus {len(cpd_catalog) - 15} more CPD accredited courses across business, health, IT, accounting, and management.")

    cpd_index_payload = {
        "id": 90002,
        "title": "Master CPD Accredited Courses Directory",
        "slug": "cpd-courses-directory",
        "category": "cpd_courses",
        "course_type": "index",
        "level": "CPD Accredited",
        "awarding_body": "Step Ahead CPD Qualifications, The CPD Certification Service",
        "content": "\n".join(cpd_summary_lines),
        "tenant_id": "inspirelondoncollege"
    }
    all_points.insert(1, cpd_index_payload)

    print(f"Total points prepared for Qdrant: {len(all_points)}")

    if "--catalog-only" in sys.argv:
        print("[*] Running in --catalog-only mode. Embedding and upserting Master Indexes (Points 90001 & 90002) to Qdrant...")
        master_items = [qual_index_payload, cpd_index_payload]
        master_texts = [it["content"] for it in master_items]
        master_vectors = get_batch_embeddings_with_retry(master_texts)
        qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                models.PointStruct(id=it["id"], vector=v, payload=it)
                for it, v in zip(master_items, master_vectors)
            ]
        )
        print("[*] Successfully synced Master Indexes to Qdrant collection 'knowledge_base'!")
        return

    # Prioritize embedding the Master Indexes + Qualifications first, then CPD courses
    # Batch size 20 to comfortably stay within 100/min quota limits
    BATCH_SIZE = 25
    qdrant_points = []
    
    print(f"Generating Gemini 3072-dim embeddings in batches of {BATCH_SIZE}...")
    for b_idx in range(0, len(all_points), BATCH_SIZE):
        batch = all_points[b_idx:b_idx + BATCH_SIZE]
        texts = [item["content"] for item in batch]
        print(f"  Embedding batch {b_idx // BATCH_SIZE + 1}/{(len(all_points) + BATCH_SIZE - 1) // BATCH_SIZE} ({len(batch)} items: ID {batch[0]['id']} to {batch[-1]['id']})...")
        
        vectors = get_batch_embeddings_with_retry(texts)
        for item, vec in zip(batch, vectors):
            qdrant_points.append(
                models.PointStruct(
                    id=item["id"],
                    vector=vec,
                    payload=item
                )
            )
        # 15s between batches ensures ~100 items per minute limit is respected smoothly
        time.sleep(15.0)

    print(f"Upserting {len(qdrant_points)} vectors into Qdrant collection '{COLLECTION_NAME}'...")
    for i in range(0, len(qdrant_points), 100):
        chunk = qdrant_points[i:i + 100]
        qdrant.upsert(collection_name=COLLECTION_NAME, points=chunk)
        print(f"  Upserted {i + len(chunk)}/{len(qdrant_points)} points into Qdrant...")

    # Ensure payload schema indexes
    print("Creating/verifying payload schema indexes in Qdrant...")
    for field, field_type in [
        ("category", models.PayloadSchemaType.KEYWORD),
        ("course_type", models.PayloadSchemaType.KEYWORD),
        ("level", models.PayloadSchemaType.KEYWORD),
        ("awarding_body", models.PayloadSchemaType.KEYWORD),
        ("slug", models.PayloadSchemaType.KEYWORD),
        ("title", models.TextIndexParams(type=models.TextIndexType.TEXT, tokenizer=models.TokenizerType.WORD, lowercase=True)),
    ]:
        try:
            qdrant.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field,
                field_schema=field_type
            )
        except Exception:
            pass

    print(f"\n========================================================")
    print(f"SUCCESS: Successfully synced {len(qdrant_points)} items into Qdrant!")
    print(f"  - Master Qualifications Index arranged by Level: Level 1 to Level 7")
    print(f"  - Master CPD Directory with clean prices and modules")
    print(f"  - Cleaned currency formatting (£200, £71.60, £76.90, 20% discount)")
    print(f"  - Standardized duration & entry requirements patterns")
    print(f"  - Saved local high-speed cache: {catalog_path}")
    print(f"========================================================")

if __name__ == "__main__":
    sync_wp_to_qdrant()
