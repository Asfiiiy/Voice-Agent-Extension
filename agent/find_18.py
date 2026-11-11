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
        SELECT p.ID, p.post_title, m.meta_value 
        FROM twh_posts p 
        JOIN twh_postmeta m ON p.ID = m.post_id 
        WHERE p.post_type='product' AND p.post_status='publish' 
          AND m.meta_key='requirements'
          AND (m.meta_value LIKE '%18%above%' OR m.meta_value LIKE '%aged 18%' OR m.meta_value LIKE '%age 18%')
    """)
    rows = cur.fetchall()
    print("Found courses requiring age 18+:", len(rows))
    for r in rows:
        print(f"ID: {r['ID']} | Title: {r['post_title']}")
        print(f"  Req: {clean_html(r['meta_value'])[:200]}")
        print()
conn.close()
