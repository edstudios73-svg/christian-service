"""Makes the 1200x630 link-preview pictures in assets/og-ministries/ (needs Playwright with Chromium).
Run from the repository root:  python3 scripts/make-ministry-previews.py"""
import json, os
from playwright.sync_api import sync_playwright

root = os.getcwd()
with sync_playwright() as p:
    browser = p.chromium.launch(args=['--allow-file-access-from-files'])
    page = browser.new_page(viewport={'width': 1200, 'height': 630})
    for m in json.load(open('scripts/ministries.json', encoding='utf-8')):
        html = f"""<body style="margin:0;width:1200px;height:630px;background:#0a1a3f;font-family:Georgia,'Times New Roman',serif;color:#fff;position:relative;overflow:hidden">
<div style="position:absolute;inset:0;background:radial-gradient(circle at 92% 0,rgba(217,180,92,.38),transparent 42%),radial-gradient(circle at 0 100%,rgba(36,70,143,.95),transparent 55%)"></div>
<div style="position:absolute;inset:22px;border:2px solid rgba(217,180,92,.5);border-radius:22px"></div>
<div style="position:absolute;left:70px;top:62px;display:flex;align-items:center;gap:16px"><img src="file://{root}/assets/church-logo.png" style="width:74px;height:74px;border-radius:50%;background:#fff;padding:4px"><div><div style="font-size:28px;font-weight:700">Christian Service Church</div><div style="font:700 14px Arial;letter-spacing:.26em;color:#d9b45c;margin-top:6px">HOUSE OF TESTIMONIES</div></div></div>
<div style="position:absolute;left:70px;top:196px;width:560px">
 <div style="display:inline-block;font:800 16px Arial;letter-spacing:.22em;color:#0a1a3f;background:#d9b45c;border-radius:999px;padding:10px 20px">MEMBERS AREA</div>
 <div style="margin-top:22px;font-size:{64 if len(m['name'])<17 else 54}px;line-height:1.04;font-weight:700">{m['name']}</div>
 <div style="margin-top:18px;font-size:28px;line-height:1.35;font-style:italic;color:#dfe6f7">{m['tagline']}</div>
 <div style="margin-top:26px;font:600 19px Arial;color:#b9c4e3;letter-spacing:.04em">Sign in with your index number</div>
</div>
<div style="position:absolute;right:64px;top:92px;width:468px;height:446px;border-radius:26px;overflow:hidden;border:2px solid rgba(217,180,92,.6);box-shadow:0 26px 60px rgba(0,0,0,.45);background:#fff"><img src="file://{root}/{m['art']}" style="width:100%;height:100%;object-fit:cover"></div>
</body>"""
        tmp = os.path.join(root, '.preview-tmp.html')
        open(tmp, 'w', encoding='utf-8').write(html)
        page.goto('file://' + tmp)
        page.wait_for_timeout(400)
        page.screenshot(path=f"assets/og-ministries/{m['slug']}.jpg", type='jpeg', quality=88)
        print('made', m['slug'])
    browser.close()
if os.path.exists('.preview-tmp.html'):
    os.remove('.preview-tmp.html')
