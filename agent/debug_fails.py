import pymysql
from wp_connector import expand_query, search_db_courses, search_db_pages

conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='ilc_db')
cur = conn.cursor(pymysql.cursors.DictCursor)

print("--- 1. PHLEBOTOMY ---")
cur.execute("SELECT ID, post_title FROM twh_posts WHERE post_type = 'product' AND post_status = 'publish' AND post_title LIKE '%Phlebotomy%'")
for r in cur.fetchall():
    print(r['ID'], r['post_title'])

print("\n--- 2. FOOD HYGIENE ---")
cur.execute("SELECT ID, post_title FROM twh_posts WHERE post_type = 'product' AND post_status = 'publish' AND post_title LIKE '%Food%'")
for r in cur.fetchall()[:5]:
    print(r['ID'], r['post_title'])

print("\n--- 3. PROJECT MANAGEMENT ---")
cur.execute("SELECT ID, post_title FROM twh_posts WHERE post_type = 'product' AND post_status = 'publish' AND post_title LIKE '%Project%'")
for r in cur.fetchall()[:5]:
    print(r['ID'], r['post_title'])

print("\n--- 4. REFUND / TERMS ---")
cur.execute("SELECT ID, post_title, post_type FROM twh_posts WHERE post_title LIKE '%Refund%' OR post_title LIKE '%Terms%' OR post_content LIKE '%refund%'")
for r in cur.fetchall()[:5]:
    print(r['ID'], r['post_title'], r['post_type'])

print("\n--- 5. UNIVERSITY PROGRESSION ---")
cur.execute("SELECT ID, post_title, post_type FROM twh_posts WHERE post_title LIKE '%Progression%' OR post_content LIKE '%university progression%'")
for r in cur.fetchall()[:5]:
    print(r['ID'], r['post_title'], r['post_type'])
