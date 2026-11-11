import pymysql
import re

conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='ilc_db', charset='utf8mb4')
cur = conn.cursor(pymysql.cursors.DictCursor)

def test_search(query, limit=5):
    p = 'twh_'
    q_low = query.strip().lower()

    # Category matching:
    # Build search phrases for category
    cat_terms = [q_low]
    if q_low in ('it', 'tech', 'computing'):
        cat_terms = ['information-technology', 'information technology', 'computing']
    elif 'health' in q_low or 'social care' in q_low:
        cat_terms = ['health-and-social-care', 'health-social-care', 'health & social care', 'health and social care']

    # Query matching term_taxonomy and terms
    cur.execute(f"""
        SELECT DISTINCT tr.object_id, t.name as cat_name, t.slug as cat_slug
        FROM {p}term_relationships tr
        JOIN {p}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        JOIN {p}terms t ON tt.term_id = t.term_id
        WHERE tt.taxonomy = 'product_cat'
    """)
    cat_rows = cur.fetchall()
    cat_matched_ids = {}
    import html
    for r in cat_rows:
        cn = html.unescape(r['cat_name']).lower()
        cs = r['cat_slug'].lower()
        for ct in cat_terms:
            if ct in cn or ct in cs or (ct == 'it' and ('information-technology' in cs or 'information technology' in cn)):
                cat_matched_ids[r['object_id']] = cn

    # Query all published products
    cur.execute(f"SELECT ID, post_title FROM {p}posts WHERE post_type='product' AND post_status='publish'")
    all_posts = cur.fetchall()

    # Whole-word title match terms
    title_terms = [q_low]
    if q_low == 'it':
        title_terms = ['it', 'information technology', 'computing', 'computer systems', 'computer science']
    elif 'health' in q_low or 'social care' in q_low:
        title_terms = ['health and social care', 'health & social care', 'social care']

    excluded_words = ['bundle', 'reprint', 'badge', 'payment link', 'initial deposit', 'fast track', 'full fee', 'installments', 'instalment']

    results = []
    seen = set()

    for row in all_posts:
        pid = row['ID']
        title = html.unescape(row['post_title'])
        t_low = title.lower()

        if any(w in t_low for w in excluded_words):
            continue

        in_cat = pid in cat_matched_ids
        title_matched = False
        for term in title_terms:
            if len(term) <= 3:
                # STRICT whole-word boundary for short terms like 'it'
                if re.search(r'\b' + re.escape(term) + r'\b', t_low, re.IGNORECASE):
                    title_matched = True
                    break
            else:
                if term in t_low:
                    title_matched = True
                    break

        if in_cat or title_matched:
            cur.execute(f"""
                SELECT meta_key, meta_value FROM {p}postmeta 
                WHERE post_id = %s AND meta_key IN ('course_level', 'awarding_body')
            """, (pid,))
            meta = {m['meta_key']: m['meta_value'] for m in cur.fetchall()}
            ab = meta.get('awarding_body')
            lvl = meta.get('course_level')
            if not ab:
                if 'othm' in t_low: ab = 'OTHM Qualifications'
                elif 'qualifi' in t_low: ab = 'Qualifi Ltd.'
                elif 'focus' in t_low: ab = 'Focus Awards'
                elif 'nocn' in t_low: ab = 'NOCN'
                elif 'icq' in t_low: ab = 'iCQ Awards'
                else: ab = 'Inspire London College'
            if not lvl:
                l_m = re.search(r'level\s*([0-9])', t_low)
                lvl = f'Level {l_m.group(1)}' if l_m else 'Professional Qualification'

            clean_title = title.replace('&amp;', '&').replace('–', '-').strip()
            if clean_title not in seen:
                seen.add(clean_title)
                combined_text = f"{(ab or '').lower()} {t_low}"
                is_regulated = bool(re.search(r'\b(othm|qualifi|focus awards|nocn|icq|ofqual|rqf|nvq)\b', combined_text))
                # Exclude internal non-accredited CPD / Professional Development if regulated options exist
                is_cpd = 'professional development' in t_low or 'cpd' in t_low
                direct_title_match = any(t in t_low for t in ['health and social care', 'health & social care']) if 'health' in q_low else (q_low in t_low)
                # 0: Direct title match + regulated diploma
                # 1: Regulated body + category match (not CPD)
                # 2: Regulated body (not CPD)
                # 3: Category match
                # 4: Other courses / CPD
                if direct_title_match and is_regulated and not is_cpd:
                    priority = 0
                elif is_regulated and in_cat and not is_cpd:
                    priority = 1
                elif is_regulated and not is_cpd:
                    priority = 2
                elif in_cat and not is_cpd:
                    priority = 3
                else:
                    priority = 4

                results.append({
                    'title': clean_title,
                    'level': lvl,
                    'awarding_body': ab,
                    '_priority': priority
                })

    results.sort(key=lambda x: (x['_priority'], x['title']))
    return results[:limit]

print("=== search_courses('IT') ===")
for r in test_search('IT'):
    print(r)

print("\n=== search_courses('health and social care') ===")
for r in test_search('health and social care'):
    print(r)
