import pymysql, re

conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='', db='ilc_db')
cur = conn.cursor(pymysql.cursors.DictCursor)
cur.execute("SELECT ID, post_title, post_name FROM twh_posts WHERE post_type='product' AND post_status='publish'")
courses = cur.fetchall()

REG_BODY_PATTERNS = [
    r'\bothm\b', r'\bqualifi\b', r'\bfocus awards\b', r'\bnocn\b', r'\bicq\b', r'\beta awards\b', r'\btquk\b'
]
VARIATION_EXCLUDE = ['(fast track)', '(full fee)', '(6 month', '(8 month', '(10 month', '(initial deposit)', '(deposit)']

unique_quals = []
skipped_vars = []

for c in courses:
    cid = c['ID']
    title = c['post_title']
    cur.execute("SELECT meta_key, meta_value FROM twh_postmeta WHERE post_id=%s", (cid,))
    meta = {r['meta_key']: r['meta_value'] for r in cur.fetchall()}
    
    ab = meta.get('awarding_body', '')
    ctype = meta.get('course_type', '')
    lvl = meta.get('course_level', '')
    
    is_cpd = 'cpd' in ab.lower() or 'cpd' in ctype.lower() or 'step ahead' in ab.lower()
    is_reg = any(re.search(pat, ab.lower()) or re.search(pat, title.lower()) for pat in REG_BODY_PATTERNS) or 'ofqual' in ctype.lower() or 'rqf' in lvl.lower()
    
    if is_reg and not is_cpd:
        tl = title.lower()
        if any(v in tl for v in VARIATION_EXCLUDE):
            skipped_vars.append((cid, title))
        else:
            unique_quals.append((cid, title, ab, lvl))

print(f"Total Unique Base Regulated Qualifications: {len(unique_quals)}")
print(f"Skipped Product Variations: {len(skipped_vars)}")

by_lvl = {}
for q in unique_quals:
    # Normalize level
    lvl_str = q[3] or ""
    t = q[1].lower()
    norm_l = "Other"
    for i in [7, 6, 5, 4, 3, 2, 1]:
        if f"level {i}" in lvl_str.lower() or f"level {i}" in t:
            norm_l = f"Level {i}"
            break
    by_lvl[norm_l] = by_lvl.get(norm_l, 0) + 1

print("\nUnique Base Qualifications by Level:")
for k in sorted(by_lvl.keys()):
    print(f"  {k}: {by_lvl[k]}")
