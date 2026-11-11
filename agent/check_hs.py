import pymysql
import re

def clean_html(text):
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

conn = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='ilc_db',
    charset='utf8mb4'
)
with conn.cursor(pymysql.cursors.DictCursor) as cur:
    cur.execute("""
        SELECT p.ID, p.post_title, p.post_name 
        FROM twh_posts p 
        WHERE p.post_type='product' AND p.post_status='publish' 
          AND (p.post_title LIKE '%Level 3%Health%' OR p.post_title LIKE '%Level 3%H&S%' OR p.post_title LIKE '%Level 3%HSC%')
    """)
    rows = cur.fetchall()
    print("Found Level 3 Health courses:", len(rows))
    for r in rows:
        cur.execute("SELECT meta_value FROM twh_postmeta WHERE post_id=%s AND meta_key='requirements'", (r['ID'],))
        req = cur.fetchone()
        req_text = clean_html(req['meta_value']) if req else "NO REQUIREMENTS KEY"
        print(f"ID: {r['ID']} | Title: {r['post_title']}")
        print(f"  Requirements: {req_text[:300]}")
        print()
conn.close()
