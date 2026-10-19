"""Builds ministry-<slug>.html from ministry.html with each ministry's own link preview (title, description, image).
Run from the repository root after changing ministry.html or scripts/ministries.json:  python3 scripts/build-ministry-pages.py"""
import html, json, re

base = open('ministry.html', encoding='utf-8').read()
for m in json.load(open('scripts/ministries.json', encoding='utf-8')):
    if m.get('page', True) is False:
        continue
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

# A shareable link into the main Ministries page that previews one ministry that has no site of its own
mins = open('ministries.html', encoding='utf-8').read()
share = [
    ('virtuous-women', 'Virtuous Women of Destiny', 'Women of grace, strength and purpose. Join the women of Christian Service Church to pray, learn the Word and step boldly into what God has prepared for you.', 'virtuouswomen'),
]
for focus, name, desc, preview in share:
    url = f'https://www.christianservicechurch.org/{focus}'
    img = f'https://www.christianservicechurch.org/assets/og-ministries/{preview}.jpg'
    out = mins
    out = re.sub(r'<title>.*?</title>', f'<title>{html.escape(name)} | Christian Service Church</title>', out, count=1, flags=re.S)
    out = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(desc) + m.group(2), out, count=1)
    out = out.replace('<link rel="canonical" href="https://www.christianservicechurch.org/ministries.html">', f'<link rel="canonical" href="{url}">')
    out = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + html.escape(name + ' | Christian Service Church') + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(desc) + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:image" content=")[^"]*(")', lambda m: m.group(1) + img + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:image:secure_url" content=")[^"]*(")', lambda m: m.group(1) + img + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:image:alt" content=")[^"]*(")', lambda m: m.group(1) + html.escape(name) + ', a ministry of Christian Service Church' + m.group(2), out, count=1)
    out = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', lambda m: m.group(1) + html.escape(name + ' | Christian Service Church') + m.group(2), out, count=1)
    out = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(desc) + m.group(2), out, count=1)
    out = re.sub(r'(<meta name="twitter:image" content=")[^"]*(")', lambda m: m.group(1) + img + m.group(2), out, count=1)
    out = re.sub(r'(<meta name="twitter:image:alt" content=")[^"]*(")', lambda m: m.group(1) + html.escape(name) + ', a ministry of Christian Service Church' + m.group(2), out, count=1)
    out = out.replace('<body>', f'<body data-focus="{focus}">', 1)
    open(f'share-{focus}.html', 'w', encoding='utf-8').write(out)
    print('built', f'share-{focus}.html')
