import wp_connector

print('=== 1. search_courses_db("IT") ===')
it_courses = wp_connector.search_courses_db('IT', limit=5)
for c in it_courses:
    print(' ', c)

print('\n=== 2. get_course_details_from_db for Course 1 ===')
c1 = it_courses[0]['title']
info1 = wp_connector.get_course_details_from_db(c1)
for k, v in info1.items():
    if k == 'units' and v:
        print(f'  {k}: ({len(v)} units) {v[:3]}...')
    elif k in ('entry_requirements', 'certificate') and v:
        print(f'  {k}: {v[:80]}...')
    else:
        print(f'  {k}: {v}')

print('\n=== 3. get_course_details_from_db for Course 2 ===')
c2 = it_courses[1]['title']
info2 = wp_connector.get_course_details_from_db(c2)
for k, v in info2.items():
    if k == 'units' and v:
        print(f'  {k}: ({len(v)} units) {v[:3]}...')
    elif k in ('entry_requirements', 'certificate') and v:
        print(f'  {k}: {v[:80]}...')
    else:
        print(f'  {k}: {v}')
