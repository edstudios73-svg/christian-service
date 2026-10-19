"""Builds ministry-<slug>.html from ministry.html with each ministry's own link preview (title, description, image).
Run from the repository root after changing ministry.html or scripts/ministries.json:  python3 scripts/build-ministry-pages.py"""
import html, json, re

base = open('ministry.html', encoding='utf-8').read()
for m in json.load(open('scripts/ministries.json', encoding='utf-8')):
    name, tag, slug = m['name'], m['tagline'], m['slug']
    url = f'https://{slug}.christianservicechurch.org/'
    img = f'https://www.christianservicechurch.org/assets/og-ministries/{slug}.jpg'
    desc = f'{tag} A members-only space for updates, events and photos from the {name} at Christian Service Church. Sign in with your index number.'
    head = f'''<title>{html.escape(name)} | Christian Service Church</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:site_name" content="Christian Service Church">
<meta property="og:type" content="website">
<meta property="og:title" content="{html.escape(name)} | Members area">
<meta property="og:description" content="{html.escape(tag)} Updates, events and photos for the members of Christian Service Church.">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:secure_url" content="{img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(name)}, a ministry of Christian Service Church">
<meta property="og:locale" content="en_GH">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(name)} | Members area">
<meta name="twitter:description" content="{html.escape(tag)} Updates, events and photos for the members of Christian Service Church.">
<meta name="twitter:image" content="{img}">
<meta name="twitter:image:alt" content="{html.escape(name)}, a ministry of Christian Service Church">'''
    start = base.index('<title>')
    end = base.index('<link rel="icon" href="/favicon.ico"')
    out = base[:start] + head + '\n' + base[end:]
    open(f'ministry-{slug}.html', 'w', encoding='utf-8').write(out)
    print('built', f'ministry-{slug}.html')
