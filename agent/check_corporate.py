import pymysql
import re

def clean_html(text):
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\[[^\]]+\]', ' ', text)
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
    cur.execute("SELECT ID, post_title, post_name, post_content FROM twh_posts WHERE post_type='page' AND post_status='publish' AND (post_title LIKE '%corporate%' OR post_name LIKE '%corporate%')")
    rows = cur.fetchall()
    print("Corporate pages found:", len(rows))
    for r in rows:
        print("ID:", r['ID'])
        print("Title:", r['post_title'])
        print("Slug:", r['post_name'])
        cleaned = clean_html(r['post_content'])
        print("Content length:", len(cleaned))
        print("Content:")
        print(cleaned[:2500])
conn.close()
