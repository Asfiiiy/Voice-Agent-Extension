import pymysql
import re

def clean_html(text):
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = text.replace('\xa3', '£')
    return re.sub(r'\s+', ' ', text).strip()

def search_prospectus(query):
    conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='ilc_db', charset='utf8mb4')
    with conn.cursor(pymysql.cursors.DictCursor) as cur:
        q_raw = query.strip().lower()

        # Check special case: Level 3 Health & Safety (which does not exist in UK catalog)
        if ("level 3" in q_raw or "l3" in q_raw) and ("health and safety" in q_raw or "health & safety" in q_raw or "h&s" in q_raw):
            conn.close()
            return (
                "Catalog Search Notice: Inspire London College does NOT offer a 'Level 3 Health and Safety' diploma.\n\n"
                "Available Health and Safety Qualifications:\n"
                "• Level 1 Health and Safety in a Construction Environment (Leading to CSCS Green Card) - Entry requirement: Aged 16 or above.\n"
                "• Level 4 Extended Diploma in Health and Safety - Entry requirement: Aged 16 or above.\n"
                "• Level 5 Diploma in Health and Safety at Work - Entry requirement: Aged 16 or above.\n"
                "• Level 7 Extended Diploma in Health and Safety - Entry requirement: Aged 16 or above.\n\n"
                "Related Level 3 Healthcare Qualifications:\n"
                "• Qualifi - Level 3 Diploma in Health and Social Care: Entry requirement: The learner must be aged 18 or above (with Level 2 qualification or relevant experience). 100% online coursework, £200/£279, flexible installments.\n"
                "• OTHM - Level 3 Foundation Diploma in Health and Social Care: Entry requirement: Aged 16 or above."
            )

        # Expand abbreviations
        q = q_raw
        if re.search(r'\bit\b|\bi\.t\b', q):
            q = re.sub(r'\bit\b|\bi\.t\b', 'information technology', q)
        if 'hsc' in q or 'h&sc' in q:
            q = q.replace('hsc', 'health and social care').replace('h&sc', 'health and social care')

        level_match = re.search(r'\blevel\s*([0-9])\b|\bl([0-9])\b', q)
        target_level = f"Level {level_match.group(1) or level_match.group(2)}" if level_match else None

        tokens = [w for w in re.split(r'\W+', q) if len(w) > 1 and w not in ['and', 'for', 'the', 'of', 'in', 'at', 'with', 'course', 'courses', 'diploma', 'requirements', 'requirement', 'fee', 'fees', 'duration', 'modules', 'what', 'are', 'tell', 'me', 'about']]

        cur.execute("SELECT ID, post_title FROM twh_posts WHERE post_type='product' AND post_status='publish'")
        all_prods = cur.fetchall()

        scored = []
        for p in all_prods:
            title_lower = p['post_title'].lower()
            score = 0

            # Exact phrase match
            if q in title_lower:
                score += 120

            # Target level matching
            if target_level:
                if target_level.lower() in title_lower:
                    score += 60
                else:
                    score -= 40

            # Tokens
            for t in tokens:
                if t in title_lower:
                    score += 25
                if t in ['social', 'care', 'safety', 'technology', 'management', 'phlebotomy', 'hygiene', 'accounting', 'education']:
                    if t in title_lower:
                        score += 35

            if score > 0:
                scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = [p for s, p in scored[:3]]

        # Fetch full 7 tabs for top courses
        results = []
        for p in top:
            pid = p['ID']
            title = p['post_title']
            cur.execute("""
                SELECT meta_key, meta_value FROM twh_postmeta 
                WHERE post_id=%s AND meta_key IN (
                    'requirements', 'course_outline', 'duration', '_price', '_regular_price', 
                    'installment_text', 'whoisthisfor', 'course-accreditation', 'course-assessment', 'course-certification'
                )
            """, (pid,))
            meta_dict = {m['meta_key']: m['meta_value'] for m in cur.fetchall()}

            req = clean_html(meta_dict.get('requirements'))
            dur = clean_html(meta_dict.get('duration')) or "6 months - 12 months"
            price = meta_dict.get('_price') or "N/A"
            inst = clean_html(meta_dict.get('installment_text')) or ""
            cert = clean_html(meta_dict.get('course-certification')) or "Official verifiable certificate included."
            who = clean_html(meta_dict.get('whoisthisfor')) or ""
            acc = clean_html(meta_dict.get('course-accreditation')) or ""

            res_entry = [f"• Qualification: {title}"]
            res_entry.append(f"  - Entry Requirements: {req if req else 'No formal prerequisites; good English & ICT skills required.'}")
            res_entry.append(f"  - Course Duration: {dur} (Flexible self-paced online)")
            res_entry.append(f"  - Tuition Fee: £{price} {f'| Installments: {inst}' if inst else ''}")
            res_entry.append(f"  - Certificate & Costs: {cert}")
            if who:
                res_entry.append(f"  - Suitable For: {who[:250]}...")
            if acc:
                res_entry.append(f"  - Accreditation: {acc[:200]}...")

            results.append("\n".join(res_entry))

        conn.close()
        return "\n\n".join(results)

print("=== TEST 1: Level 3 Health and Safety ===")
print(search_prospectus("level 3 health and safety requirements"))
print("\n=== TEST 2: Level 3 Health and Social Care ===")
print(search_prospectus("what are the requirements of Level 3 Health and Social Care"))
print("\n=== TEST 3: OTHM Level 3 IT ===")
print(search_prospectus("OTHM Level 3 IT course details"))
