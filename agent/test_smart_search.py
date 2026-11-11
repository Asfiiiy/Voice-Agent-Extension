import pymysql
import re
import html
from typing import List, Dict, Any

DB_HOST = "127.0.0.1"
DB_USER = "root"
DB_PASS = ""
DB_NAME = "ilc_db"

def _clean_html(raw_html: str) -> str:
    if not raw_html: return ""
    text = re.sub(r'<[^>]+>', ' ', html.unescape(raw_html))
    return re.sub(r'\s+', ' ', text).strip()

def search_db_smart(search_term: str) -> List[Dict[str, Any]]:
    try:
        conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, charset='utf8mb4')
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            # 1. Direct title or module match
            sql1 = """
                SELECT p.ID, p.post_title, p.post_excerpt,
                       m_out.meta_value as outline,
                       m_req.meta_value as requirements,
                       m_prc.meta_value as price,
                       m_reg.meta_value as regular_price,
                       m_inst.meta_value as installment,
                       m_dur.meta_value as duration
                FROM twh_posts p
                LEFT JOIN twh_postmeta m_out ON p.ID = m_out.post_id AND m_out.meta_key = 'course_outline'
                LEFT JOIN twh_postmeta m_req ON p.ID = m_req.post_id AND m_req.meta_key = 'requirements'
                LEFT JOIN twh_postmeta m_prc ON p.ID = m_prc.post_id AND m_prc.meta_key = '_price'
                LEFT JOIN twh_postmeta m_reg ON p.ID = m_reg.post_id AND m_reg.meta_key = '_regular_price'
                LEFT JOIN twh_postmeta m_inst ON p.ID = m_inst.post_id AND m_inst.meta_key = 'installment_text'
                LEFT JOIN twh_postmeta m_dur ON p.ID = m_dur.post_id AND m_dur.meta_key = 'duration'
                WHERE p.post_type = 'product' AND p.post_status = 'publish'
                  AND (p.post_title LIKE %s OR p.post_title LIKE %s OR m_out.meta_value LIKE %s)
                ORDER BY p.ID DESC
                LIMIT 4
            """
            cur.execute(sql1, (f"%{search_term}%", f"%{search_term.replace(' ', '%')}%", f"%{search_term}%"))
            rows = cur.fetchall()

            # 2. Tokenized search if rows empty
            if not rows:
                tokens = [w for w in re.split(r'\W+', search_term.lower()) if len(w) > 2 and w not in ['what', 'the', 'for', 'and', 'with', 'course', 'courses', 'diploma', 'tell', 'about', 'online', 'level']]
                if tokens:
                    conditions = " OR ".join(["p.post_title LIKE %s" for _ in tokens[:3]])
                    sql2 = f"""
                        SELECT p.ID, p.post_title, p.post_excerpt,
                               m_out.meta_value as outline,
                               m_req.meta_value as requirements,
                               m_prc.meta_value as price,
                               m_reg.meta_value as regular_price,
                               m_inst.meta_value as installment,
                               m_dur.meta_value as duration
                        FROM twh_posts p
                        LEFT JOIN twh_postmeta m_out ON p.ID = m_out.post_id AND m_out.meta_key = 'course_outline'
                        LEFT JOIN twh_postmeta m_req ON p.ID = m_req.post_id AND m_req.meta_key = 'requirements'
                        LEFT JOIN twh_postmeta m_prc ON p.ID = m_prc.post_id AND m_prc.meta_key = '_price'
                        LEFT JOIN twh_postmeta m_reg ON p.ID = m_reg.post_id AND m_reg.meta_key = '_regular_price'
                        LEFT JOIN twh_postmeta m_inst ON p.ID = m_inst.post_id AND m_inst.meta_key = 'installment_text'
                        LEFT JOIN twh_postmeta m_dur ON p.ID = m_dur.post_id AND m_dur.meta_key = 'duration'
                        WHERE p.post_type = 'product' AND p.post_status = 'publish'
                          AND ({conditions})
                        ORDER BY p.ID DESC
                        LIMIT 3
                    """
                    cur.execute(sql2, [f"%{t}%" for t in tokens[:3]])
                    rows = cur.fetchall()

            courses = []
            for r in rows:
                price = r.get('price') or "N/A"
                reg_price = r.get('regular_price')
                inst = r.get('installment')
                p_str = f"£{price}" if price != "N/A" else "N/A"
                if reg_price and reg_price != price:
                    p_str += f" (Regular: £{reg_price})"
                if inst:
                    p_str += f" | Installments: {inst}"
                
                courses.append({
                    "name": r['post_title'],
                    "price": p_str,
                    "duration": r.get('duration') or "6 months - 12 months"
                })
            conn.close()
            return courses
    except Exception as e:
        print("Error:", e)
        return []

# Test queries real people might ask
queries = [
    "accounting and finance",
    "beauty salon management",
    "cyber security",
    "construction management",
    "hotel and hospitality management",
    "event management",
    "aerospace rocket science"  # Non-existent course
]

for q in queries:
    res = search_db_smart(q)
    print(f"\nQuery: '{q}' -> Found {len(res)} courses:")
    for c in res:
        print(f"  • {c['name']} ({c['price']})")
    if not res:
        print("  • [NO MATCH] Handled gracefully: Inform caller course not offered, suggest related fields.")
