import os
import sys
import json
import re
import time
import httpx
from html.parser import HTMLParser
from urllib.parse import urlparse

# Set up environment and paths
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.http import models
from rag import COLLECTION_NAME, QDRANT_HOST, QDRANT_PORT, VECTOR_SIZE, GOOGLE_API_KEY, EMBEDDING_MODEL

class WebTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ignore = False
        self.texts = []
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        if tag_lower in ["script", "style", "nav", "footer", "noscript", "svg", "header"]:
            self.ignore = True
        if tag_lower == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in ["script", "style", "nav", "footer", "noscript", "svg", "header"]:
            self.ignore = False
        if tag_lower == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title = data.strip()
        elif not self.ignore:
            cleaned = data.strip()
            if len(cleaned) > 2:
                self.texts.append(cleaned)


def clean_text_block(texts):
    filtered = []
    for t in texts:
        t_clean = re.sub(r'\s+', ' ', t).strip()
        if len(t_clean) < 3 or t_clean in [
            "Skip to content", "View More", "Read More", "Click Here", 
            "Close", "Menu", "Search", "Login", "Register", "Cart", "Checkout"
        ]:
            continue
        filtered.append(t_clean)
    return " ".join(filtered)


def fetch_url(url):
    print(f"[*] Fetching: {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = httpx.get(url, timeout=15.0, follow_redirects=True, headers=headers)
        if resp.status_code != 200:
            print(f"    [-] Status {resp.status_code} for {url}")
            return None
        parser = WebTextExtractor()
        parser.feed(resp.text)
        text_content = clean_text_block(parser.texts)
        return {
            "url": str(resp.url),
            "title": parser.title or url,
            "content": text_content
        }
    except Exception as e:
        print(f"    [-] Error fetching {url}: {e}")
        return None


def chunk_text(text: str, max_chunk_size: int = 700, overlap: int = 100):
    words = text.split()
    chunks = []
    current_words = []
    current_len = 0

    for w in words:
        current_words.append(w)
        current_len += len(w) + 1
        if current_len >= max_chunk_size:
            chunk = " ".join(current_words)
            chunks.append(chunk)
            overlap_words = current_words[-15:] if len(current_words) > 15 else []
            current_words = list(overlap_words)
            current_len = sum(len(x) + 1 for x in current_words)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks


def get_batch_embeddings(texts: list, batch_size: int = 60) -> list:
    """Generates 3072-dim embeddings for a list of texts using Gemini batchEmbedContents API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBEDDING_MODEL}:batchEmbedContents?key={GOOGLE_API_KEY}"
    all_embeddings = []

    total = len(texts)
    print(f"[*] Generating embeddings for {total} text chunks (batch size: {batch_size})...")

    for i in range(0, total, batch_size):
        chunk_batch = texts[i:i + batch_size]
        requests_payload = [
            {"model": EMBEDDING_MODEL, "content": {"parts": [{"text": t}]}}
            for t in chunk_batch
        ]

        # Retry up to 3 times
        success = False
        for attempt in range(1, 4):
            try:
                resp = httpx.post(url, json={"requests": requests_payload}, timeout=45.0)
                if resp.status_code == 200:
                    data = resp.json()
                    embs = [e.get("values", [0.0] * VECTOR_SIZE) for e in data.get("embeddings", [])]
                    all_embeddings.extend(embs)
                    print(f"    [+] Embedded chunks {i+1} to {min(i+batch_size, total)} / {total} (OK)")
                    success = True
                    break
                else:
                    print(f"    [!] Warning: batch embedding status {resp.status_code}, attempt {attempt}/3...")
                    time.sleep(2.0)
            except Exception as e:
                print(f"    [!] Embedding network error: {e}, attempt {attempt}/3...")
                time.sleep(2.0)

        if not success:
            print(f"    [-] Failed to embed batch {i+1}..{min(i+batch_size, total)}, filling zeroes.")
            all_embeddings.extend([[0.0] * VECTOR_SIZE for _ in chunk_batch])

    return all_embeddings


# Authoritative Structured Q&A for high-precision phone voice answers
STRUCTURED_FACTS = [
    # --- INSPIRE LONDON COLLEGE (ILC) ---
    {
        "title": "Inspire London College Overview & Accreditation",
        "url": "https://inspirelondoncollege.co.uk/about-us/",
        "category": "general",
        "tenant_id": "inspirelondoncollege",
        "content": (
            "Inspire London College (ILC) is an established UK training provider based in West London. "
            "ILC offers accredited CPD courses and OFQUAL-regulated qualifications approved by recognized awarding bodies including "
            "Qualifi, OTHM, Focus Awards, and ATHE. Qualifications range from Level 1 foundation certificates up to Level 7 postgraduate diplomas. "
            "Campus training is held in London, and flexible online distance learning is available globally."
        )
    },
    {
        "title": "ILC Phlebotomy Practical Training & Certification",
        "url": "https://inspirelondoncollege.co.uk/courses/advanced-blood-session/",
        "category": "courses",
        "tenant_id": "inspirelondoncollege",
        "content": (
            "Inspire London College offers accredited Phlebotomy training in London. "
            "Part 1 covers theoretical foundations, infection control, and legal standards. "
            "Part 2 is a practical hands-on blood collection session using venipuncture training equipment and live simulated models. "
            "The total fee ranges from £150 for introductory modules up to £450 for the full combined certificate. "
            "Students receive an accredited certificate enabling them to work as Phlebotomists or Healthcare Support Workers in clinics and hospitals."
        )
    },
    {
        "title": "ILC Regulated Business Management Qualifications Fee Schedule",
        "url": "https://inspirelondoncollege.co.uk/qualification-fee-and-pricing/",
        "category": "pricing",
        "tenant_id": "inspirelondoncollege",
        "content": (
            "Inspire London College offers interest-free monthly installment plans for OFQUAL regulated business qualifications: "
            "1. Qualifi Level 3 Diploma in Business Management: £200 deposit followed by 8 monthly payments of £46.25 (duration 6-12 months). "
            "2. Qualifi Level 4 Diploma in Business Management: £250 deposit followed by 8 monthly payments of £53.75. "
            "3. OTHM Level 5 Extended Diploma in Business Management: £350 deposit followed by 8 monthly payments of £130.25 (duration 12-24 months). "
            "4. Level 7 Postgraduate Diploma in Business Development: discounted CPD courses start from £10 promotional rate. "
            "Payments can be made via debit card, credit card, PayPal, or direct bank transfer."
        )
    },
    {
        "title": "Difference between CPD and OFQUAL Regulated Qualifications",
        "url": "https://inspirelondoncollege.co.uk/faq/",
        "category": "faq",
        "tenant_id": "inspirelondoncollege",
        "content": (
            "CPD (Continuing Professional Development) courses focus on practical skills, career development, and industry awareness with fast online completion. "
            "OFQUAL qualifications are officially regulated by the UK government's Office of Qualifications and Examinations Regulation, "
            "awarding transferable academic credits recognized by UK universities for bachelor's or master's top-up degrees."
        )
    },
    # --- UK PROFESSIONAL DEVELOPMENT ACADEMY (UKPDA) ---
    {
        "title": "UKPD Academy Overview & Accreditations",
        "url": "https://ukpdacademy.co.uk/",
        "category": "general",
        "tenant_id": "ukpdacademy",
        "content": (
            "UK Professional Development Academy (UKPDA) is a premier British online distance learning institute. "
            "UKPDA specializes in CPD-accredited professional courses and regulated diplomas across Leadership, HR, Health & Social Care, "
            "Business Management, Fire Safety, and Project Management. All courses are 100% online with 24/7 access to the student portal and tutor support."
        )
    },
    {
        "title": "UKPDA Payment Methods, Installments & Promo Codes",
        "url": "https://ukpdacademy.co.uk/payments/",
        "category": "pricing",
        "tenant_id": "ukpdacademy",
        "content": (
            "UKPD Academy offers flexible and affordable payments. Students can pay in full or choose interest-free monthly installments. "
            "Payment methods include Stripe, PayPal, major credit/debit cards, and bank transfers. "
            "Special promo code UKPDA2026 provides additional discounts on selected CPD diplomas and endorsed bundles. "
            "No hidden charges; all course materials, assessment fees, and digital certificates are included in the price."
        )
    },
    {
        "title": "UKPDA Course Assessment, Exams & Certificate Delivery",
        "url": "https://ukpdacademy.co.uk/faqs/",
        "category": "faq",
        "tenant_id": "ukpdacademy",
        "content": (
            "At UKPD Academy, courses are assessed through online multiple-choice quizzes or written assignment submissions. "
            "There are no physical exam centers or fixed schedules; students submit coursework at their own pace. "
            "Upon completion, digital PDF certificates are issued immediately. Hard copy certificates are dispatched via postal mail worldwide with verification QR codes."
        )
    },
    {
        "title": "Refund and Cancellation Policy for ILC and UKPDA",
        "url": "https://ukpdacademy.co.uk/faqs/",
        "category": "policy",
        "tenant_id": "shared",
        "content": (
            "Both Inspire London College and UKPD Academy provide a 14-day statutory money-back cancellation guarantee from the date of enrollment, "
            "provided the student has not completed more than 25% of the online course content or claimed an official completion certificate. "
            "To request a refund or course exchange, contact the admissions support team via email or support ticket."
        )
    }
]


def build_unified_rag():
    print("=" * 65)
    print("BUILDING UNIFIED RAG SYSTEM: ILC + UKPDA")
    print("=" * 65)

    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "my_knowledge_base.json")
    json_path = os.path.abspath(json_path)

    # If my_knowledge_base.json already exists and has 20+ pages, we can load it directly or refetch
    all_pages = []
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                all_pages = json.load(f)
            print(f"[*] Found existing knowledge base with {len(all_pages)} records.")
        except Exception:
            all_pages = []

    if len(all_pages) < 20:
        urls_to_fetch = [
            # Inspire London College core pages
            "https://inspirelondoncollege.co.uk/",
            "https://inspirelondoncollege.co.uk/about-us/",
            "https://inspirelondoncollege.co.uk/faq/",
            "https://inspirelondoncollege.co.uk/qualification-fee-and-pricing/",
            "https://inspirelondoncollege.co.uk/business-management-ofqual-qualifications/",
            "https://inspirelondoncollege.co.uk/accounting-finance-qualifications/",
            "https://inspirelondoncollege.co.uk/cyber-security-ofqual-qualifications/",
            "https://inspirelondoncollege.co.uk/product/advanced-blood-session/",
            # UKPD Academy core pages
            "https://ukpdacademy.co.uk/",
            "https://ukpdacademy.co.uk/faqs/",
            "https://ukpdacademy.co.uk/payments/",
            "https://ukpdacademy.co.uk/regulated-qualifications/business-management-ofqual/",
            "https://ukpdacademy.co.uk/regulated-qualifications/health-social-care/",
            "https://ukpdacademy.co.uk/product/level-1-award-in-fire-safety-awareness/",
            "https://ukpdacademy.co.uk/product/level-3-certificate-in-leadership/",
            "https://ukpdacademy.co.uk/product/level-5-diploma-in-crisis-and-risk-management/",
            "https://ukpdacademy.co.uk/product/level-5-diploma-in-human-resource-administrators/",
            "https://ukpdacademy.co.uk/product/level-1-certificate-in-hotel-management/",
        ]

        all_pages = []
        page_id = 1
        print(f"\n[Step 1/3] Fetching {len(urls_to_fetch)} live web pages from ILC and UKPDA...")
        for u in urls_to_fetch:
            data = fetch_url(u)
            if data and len(data["content"]) > 100:
                tenant_id = "inspirelondoncollege" if "inspirelondoncollege" in u else "ukpdacademy"
                category = "general"
                if any(k in u for k in ["fee", "price", "pricing", "payment"]):
                    category = "pricing"
                elif any(k in u for k in ["faq", "question"]):
                    category = "faq"
                elif any(k in u for k in ["course", "product", "qualification", "diploma", "phlebotomy"]):
                    category = "courses"

                all_pages.append({
                    "id": page_id,
                    "title": data["title"],
                    "url": data["url"],
                    "category": category,
                    "tenant_id": tenant_id,
                    "content": data["content"]
                })
                print(f"  [+] Scraped: {data['title'][:45]}... ({len(data['content']):,} chars)")
                page_id += 1

        # Add high-precision structured facts
        for fact in STRUCTURED_FACTS:
            fact_copy = dict(fact)
            fact_copy["id"] = page_id
            all_pages.append(fact_copy)
            page_id += 1

        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(all_pages, f, indent=2, ensure_ascii=False)
        print(f"\n[✓] Saved {len(all_pages)} records to '{json_path}'.")

    # 2. Chunk all records
    print("\n[Step 2/3] Chunking all articles into searchable text segments...")
    chunk_payloads = []
    chunk_texts = []
    point_id = 1

    for page in all_pages:
        title = page["title"]
        url = page["url"]
        category = page["category"]
        tenant_id = page.get("tenant_id", "default")
        content = page["content"]

        chunks = chunk_text(content, max_chunk_size=700, overlap=100)
        for idx, chunk in enumerate(chunks):
            chunk_title = f"{title} (Part {idx+1})" if len(chunks) > 1 else title
            chunk_texts.append(chunk)
            chunk_payloads.append({
                "id": point_id,
                "title": chunk_title,
                "url": url,
                "category": category,
                "tenant_id": tenant_id,
                "content": chunk
            })
            point_id += 1

    total_chunks = len(chunk_texts)
    print(f"  [✓] Created {total_chunks} text chunks.")

    # 3. High-Speed Batch Embeddings
    print("\n[Step 3/3] Generating 3072-dim Gemini embeddings via batch API...")
    vectors = get_batch_embeddings(chunk_texts, batch_size=60)

    # 4. Upload to Qdrant
    print(f"\n[*] Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=15.0)

    collections = client.get_collections().collections
    if any(c.name == COLLECTION_NAME for c in collections):
        print(f"[*] Re-creating collection '{COLLECTION_NAME}' for fresh indexing...")
        client.delete_collection(COLLECTION_NAME)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE)
    )

    all_points = []
    for i in range(len(chunk_payloads)):
        all_points.append(
            models.PointStruct(
                id=chunk_payloads[i]["id"],
                vector=vectors[i],
                payload=chunk_payloads[i]
            )
        )

    print(f"[*] Uploading {len(all_points)} searchable vector chunks into Qdrant in batches of 50...")
    batch_size = 50
    for i in range(0, len(all_points), batch_size):
        batch = all_points[i:i + batch_size]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)
        print(f"    --> Stored points {i+1} to {min(i+batch_size, len(all_points))} / {len(all_points)}")

    print("\n" + "=" * 65)
    print(f"[✓] UNIFIED RAG SYSTEM READY! Qdrant collection '{COLLECTION_NAME}' contains {len(all_points)} searchable vectors.")
    print("=" * 65)


if __name__ == "__main__":
    build_unified_rag()
