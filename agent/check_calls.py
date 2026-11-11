import pymysql

conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='callcenter_db', charset='utf8mb4')
with conn.cursor(pymysql.cursors.DictCursor) as cur:
    cur.execute("SELECT id, caller, transcript, created_at FROM calls ORDER BY id DESC LIMIT 5")
    rows = cur.fetchall()
    for r in rows:
        print(f"=== CALL {r['id']} at {r['created_at']} ===")
        print(r['transcript'])
        print()
conn.close()
