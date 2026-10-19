// Serves a ministry's static page with its social-preview image taken live from the Ministries
// table, so changing the thumbnail in Admin > Ministries updates the link preview too.
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://uysfgupzlxfhplwqcttp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5T68Teyy88wmJUlckVRneA_Yfh0OKZV';
const SITE = 'https://www.christianservicechurch.org';

// page file -> og card name and the words that identify its row in the Ministries table
const PAGES = {
  'ministry-mediateam': { card: 'mediateam', match: ['media'] },
  'ministry-youth': { card: 'youth', match: ['youth', 'vibrant'] },
  'ministry-prayer': { card: 'prayer', match: ['prayer'] },
  'ministry-ushers': { card: 'ushers', match: ['usher', 'protocol'] },
  'ministry-choir': { card: 'choir', match: ['choir', 'ezekiel'] },
  'ministry-evangelism': { card: 'evangelism', match: ['evangel'] },
  'share-virtuous-women': { card: 'virtuouswomen', match: ['virtuous', 'women'] },
  'share-children': { card: 'children', match: ['child'] },
};

async function thumbnailFor(match) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/ministries?select=title,image,updated_at&order=updated_at.desc.nullslast`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: controller.signal,
    });
    if (!response.ok) return '';
    const rows = await response.json();
    const row = rows.find((r) => match.some((word) => String(r.title || '').toLowerCase().includes(word)));
    return row && row.image ? String(row.image).trim() : '';
  } catch (_) {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  const name = String((req.query && req.query.page) || '');
  const page = PAGES[name];
  if (!page) { res.statusCode = 404; res.end('Not found'); return; }
  let html;
  try {
    html = fs.readFileSync(path.join(process.cwd(), `${name}.html`), 'utf8');
  } catch (_) {
    res.statusCode = 404; res.end('Not found'); return;
  }
  // Pictures that ship with the site already have a ready-made 1200x630 card; uploaded ones are used as they are.
  const image = await thumbnailFor(page.match);
  if (/^https?:\/\//i.test(image) && !image.startsWith(SITE)) {
    const safe = image.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    html = html
      .replace(/(<meta property="og:image(?::secure_url)?" content=")[^"]*(")/g, `$1${safe}$2`)
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/g, `$1${safe}$2`)
      .replace(/<meta property="og:image:(?:type|width|height)" content="[^"]*">\s*/g, '');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
  res.statusCode = 200;
  res.end(html);
};
