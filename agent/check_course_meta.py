import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='ilc_db',
    charset='utf8mb4'
)
with conn.cursor() as cur:
    cur.execute("SELECT meta_value FROM twh_postmeta WHERE post_id=25010 AND meta_key='course-certification'")
    val = cur.fetchone()[0]
    idx = val.find("cost you")
    snippet = val[idx:idx+30]
    print("Snippet:", repr(snippet))
    for ch in snippet:
        print(ch, ord(ch), hex(ord(ch)))
conn.close()
