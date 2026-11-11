import asyncio
import pymysql
import re
import html
from wp_connector import get_live_site_data, expand_query, search_db_courses

conn = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='ilc_db',
    charset='utf8mb4'
)
cur = conn.cursor(pymysql.cursors.DictCursor)

# 1. Total counts
cur.execute("SELECT COUNT(*) as cnt FROM twh_posts WHERE post_type = 'product' AND post_status = 'publish'")
total = cur.fetchone()['cnt']
print(f"=== Total Published Products in DB: {total} ===")

# 2. Select diverse courses
queries_to_test = [
    # Qualifications
    ("OTHM Level 3 IT", "modules of OTHM Level 3 Foundation Diploma in Information Technology"),
    ("Level 7 Strategic Management", "fees and modules of Level 7 Diploma in Strategic Management and Leadership"),
    ("Level 4 Health and Social Care", "tell me about Level 4 Health and Social Care course"),
    ("Phlebotomy Practical", "what is the fee and practical dates for phlebotomy training in London?"),
    ("OTHM Level 5 Business Management", "what are the units for Level 5 Diploma in Business Management?"),
    ("Education and Training (AET / Level 3)", "tell me about Level 3 Award in Education and Training AET"),
    
    # CPD Courses
    ("CPD Health and Safety", "do you offer Health and Safety training?"),
    ("CPD Food Hygiene", "food hygiene course details and certificate"),
    ("CPD Project Management", "project management certificate course fees and duration"),
    
    # Institution / Policy / General questions
    ("Refund Policy", "what is your cancellation and refund policy?"),
    ("Corporate Training", "tell me about corporate staff training packages"),
    ("How many qualifications", "how many qualifications do you offer and at what levels?"),
    ("University Progression", "can I progress to a UK university with your diplomas?")
]

async def run_suite():
    results = []
    print("\n" + "="*80)
    print("STARTING COMPREHENSIVE BENCHMARK TEST SUITE")
    print("="*80 + "\n")

    for category, q in queries_to_test:
        print(f"[*] Testing [{category}]: \"{q}\"")
        out = await get_live_site_data(q)
        has_content = len(out) > 50 and "No specific record found" not in out
        
        # Check details
        has_price = "£" in out or "Tuition Fee" in out or "Fee:" in out
        has_duration = "duration" in out.lower() or "month" in out.lower()
        has_modules = "module" in out.lower() or "unit" in out.lower() or "credit" in out.lower()
        
        status = "PASS" if has_content else "FAIL"
        print(f"    --> Status: [{status}] (Len: {len(out)} chars)")
        print(f"    --> Price: {'YES' if has_price else 'NO'} | Duration: {'YES' if has_duration else 'NO'} | Units: {'YES' if has_modules else 'NO'}")
        print(f"    --> Preview: {out.replace(chr(10), ' ')[:140]}...")
        print("-" * 80)
        
        results.append({
            "category": category,
            "query": q,
            "status": status,
            "has_price": has_price,
            "has_duration": has_duration,
            "has_modules": has_modules,
            "preview": out[:200]
        })
        
    print("\n" + "="*80)
    print("TEST SUITE SUMMARY REPORT")
    print("="*80)
    passed = sum(1 for r in results if r["status"] == "PASS")
    print(f"Total Tests: {len(results)} | PASSED: {passed} | FAILED: {len(results) - passed}")
    
    fails = [r for r in results if r["status"] == "FAIL"]
    if fails:
        print("\nFAILED QUERIES (Need Attention):")
        for f in fails:
            print(f"  - [{f['category']}]: '{f['query']}'")
    else:
        print("\nAll tested queries resolved successfully!")

if __name__ == "__main__":
    asyncio.run(run_suite())
