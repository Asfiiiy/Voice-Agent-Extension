import os
import psycopg2

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute('SELECT id, caller, duration, status, summary, "createdAt" FROM "Call" ORDER BY "createdAt" DESC LIMIT 1')
call = cur.fetchone()
print('=== LATEST CALL RECORD ===')
if call:
    print(f"ID: {call[0]}")
    print(f"Caller: {call[1]}")
    print(f"Duration: {call[2]}s")
    print(f"Status: {call[3]}")
    print(f"Summary: {call[4]}")
    print(f"Time: {call[5]}")
    print('\n=== CONVERSATION TRANSCRIPT ===')
    cur.execute('SELECT speaker, message, timestamp FROM "Transcript" WHERE "callId"=%s ORDER BY timestamp ASC', (call[0],))
    for r in cur.fetchall():
        print(f"[{r[0]}]: {r[1]}")
else:
    print("No calls found.")
cur.close()
conn.close()
