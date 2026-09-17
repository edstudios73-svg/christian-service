# Christian Service Church — Website SEO & GEO Handover

Prepared 19 September 2026. Read this once before you put the site live.

---

## 1. Things you MUST confirm before going live

These are the only places where I could not be 100% sure. Fix them and the site is ready.

### a) The service times

Your own photo `gallery/building.jpg` is a picture of the church signboard. The times on the
signboard did **not** match the times the website was showing. I used the **signboard** times,
because a signboard in front of the church is more likely to be correct than a website.

| Day       | Meeting                   | Time now on the site  | What the old site said |
|-----------|---------------------------|-----------------------|------------------------|
| Sunday    | Sunday Worship            | 9:00 AM – 12:00 noon  | 9:00 AM                |
| Monday    | Prayer Meeting            | 6:30 – 7:30 PM        | 6:00 PM                |
| Tuesday   | Virtuous Women of Destiny | 9:00 AM – 12:00 noon  | 10:00 AM               |
| Tuesday   | Youth Fellowship          | 6:30 – 7:30 PM        | 6:30 PM                |
| Wednesday | Bible Studies             | 6:30 – 7:30 PM        | **9:00 AM**            |
| Thursday  | Women Fellowship          | 6:30 – 7:30 PM        | 6:00 PM                |
| Saturday  | Shiloh Hour               | 9:00 – 11:00 AM       | 10:00 AM               |

**Check these with the church office.** Wrong service times is the single worst mistake a church
website can make, because somebody will drive to East Legon and meet a locked gate.

If any time changes, update it in these five places:
`index.html` (the table, the FAQ and the top info boxes), `js/app.js` (the footer),
`llms.txt`, `ministries.html`, and the JSON-LD block at the top of every page.

### b) Your website address (domain)

I used **`https://www.christianservicechurch.org`** everywhere, because that matches your
email address. If your real domain is different, run this one command in the site folder and
everything will be corrected at once:

```bash
grep -rl "www.christianservicechurch.org" . | xargs sed -i 's|www.christianservicechurch.org|YOUR-REAL-DOMAIN.com|g'
```

### c) The pastor's name

Your files spelled it four different ways: **Payin**, **Panin**, "Rev. Dr. Joseph P. Ezekiel",
and "Rev Dr Payin". I standardised everything to **Rev. Dr. Joseph Payin Ezekiel**, and his
title to **General Overseer** (the old site called him Senior Pastor on one page, General
Overseer on another, and Lead Pastor on a third).

If the correct spelling is "Panin", do a find-and-replace for `Payin` across all files.

### d) The testimonies

The old testimonies read like they were written by AI, not by real members. One claimed a
serious illness disappeared between two hospital visits. Another claimed a marriage was saved
from divorce. **Publishing stories that did not happen will damage the church's name**, and
Google now checks whether reviews and testimonies look genuine.

I rewrote them in plain language and removed the dramatic claims. But they are still not real.
**Please replace them with real testimonies from real members**, with their permission, in
`testimonies.html`. Even three true short stories are worth more than six invented ones.

### e) Social media links

The footer links to Facebook, Instagram and YouTube are currently pointing to the homepages
of those sites, because the old site had `href="#"` (a dead link). Put your real page
addresses in `js/app.js`, and also add them to the `sameAs` list in `apply_seo.py`
(or directly in the JSON-LD of each page). The WhatsApp link already works:
it opens a chat with 0551172156.

### f) Mobile Money details

The giving page now explains how to give by MoMo, but I do not know your merchant number,
so it tells people to call the office for it. Put the real merchant number and the church
bank account details in `giving.html` and it will work much better.

---

## 2. What was changed on the site

### Search engine work (SEO)

- **Every page got a new `<head>`.** Each page now has its own title and description written
  around the words people actually search — "church in East Legon", "church in Accra",
  "Sunday service", and the church's name.
- **Canonical links** on every page, so Google knows which address is the real one.
- **Structured data (JSON-LD)** on every page. This is the most important change. It tells
  Google, in a language Google understands, that this is a church, where it is, the exact GPS
  position, what time every meeting holds, who founded it and who leads it. This is what makes
  Google show your service times directly in the search results.
- **`sitemap.xml`** — a list of all 13 pages for Google to crawl.
- **`robots.txt`** — tells search engines they are welcome, and explicitly welcomes AI
  assistants too.
- **Real Google Map** embedded on the homepage and the contact page. The old contact page was
  showing a *photograph* pretending to be a map.
- **Image alt text** on all gallery photos, written with real descriptions
  ("Members seated during a Sunday worship service at Christian Service Church, East Legon").
  This gets the photos into Google Images.
- **A new footer on every page** carrying the full address, Plus Code, phone, WhatsApp, email
  and all service times. Search engines check that a business's name, address and phone number
  are the same everywhere. Now they are.
- **New FAQ section** on the homepage answering the eight questions people actually ask before
  visiting a church.

### AI search work (GEO)

When somebody asks ChatGPT, Claude, Gemini or Perplexity *"what time is service at Christian
Service Church in Accra?"*, these are what decide whether the AI answers correctly:

- **`llms.txt`** — a new file written in plain text, listing every fact about the church:
  address, GPS, phone, all service times, leadership, ministries, beliefs, and short answers to
  the common questions. AI systems read this file directly.
- **The FAQ section and FAQ structured data** — written as questions and answers, which is the
  format AI systems quote from most easily.
- **Clear, factual sentences** instead of flowery language. An AI cannot repeat
  "a Spirit-filled family devoted to discipleship" as a useful answer. It can repeat
  "Sunday worship starts at 9:00 AM at Jungle Avenue Road, East Legon, Accra."

### AI-written content removed

| What it said | What was wrong |
|---|---|
| Pastor "holds a Doctor of Ministry degree", "more than two decades", "planted churches", "five children" | Invented details presented as fact |
| A long quote in the pastor's own voice about a call he received as a young man | A fabricated quote |
| "47 Years of Ministry", "500 Members", "1 Nations Reached" | Invented numbers, and "1 Nations" is not English |
| A year-by-year history (2000, 2001, 2008, 2015) | Entirely invented |
| Leaders' phone numbers like +233 50 123 4567 and emails @churchservice.com | Fake contacts — now all point to the church office |
| Testimonies with specific medical and marriage claims | Invented (see section 1d above) |
| Prayer page: "Monday Prayer Meeting — join us every Friday" | Said Monday and Friday in the same sentence |

### Plain English rewrite

Every page was rewritten for a normal Ghanaian reader. Short sentences, common words.

- "Come As You Are, Leave Transformed" → "Come As You Are"
- "A Spirit-filled family devoted to worship, discipleship, prayer, and community" →
  "We are a Bible-believing church on Jungle Avenue Road, East Legon, Accra. We worship God,
  teach the Bible, pray together and help people."
- "Nurturing the next generation through fun, safe, and Spirit-filled teaching" →
  "We teach children from 3 to 12 years about God in a safe and happy place, every Sunday."
- "Standing in the gap for the nations — pursuing God's presence through fervent prayer" →
  "We pray for the church, for members and for the nation."

### Ghana-specific fixes

- **Giving was in US dollars** ($10, $25, $50...). It is now in **Ghana Cedis**
  (GH₵20, GH₵50, GH₵100, GH₵200, GH₵500, GH₵1,000).
- **Added a Mobile Money section** with step-by-step MoMo instructions, since that is how most
  people in Ghana give.
- Fixed "Cantoments" → "Cantonments".
- Changed "Main Sanctuary" to "Church Auditorium, East Legon".
- Page language set to `en-GH` (English, Ghana) instead of plain `en`.

### Broken things that were fixed

- The homepage hero had an unclosed `<div>` and a missing `</section>`, which breaks the page
  layout in some browsers.
- Three sermon links pointed to `sermons/4.mp4`, a file that did not exist.
- A file named `1 (1).mp4` (a space and brackets in a filename breaks on many web servers) was
  renamed to `4.mp4`.
  web address turn into `%20` and look broken when shared.
- Deleted the leftover Next.js files (`package.json`, `tailwind.config.js`, `app/`,
  `components/`, `tsconfig.json`) and a duplicate `public/` folder. They did nothing on this
  site and only added weight.

---

## 3. What to do next — in order of importance

### Step 1 — Google Business Profile (do this first, today)

**This matters more than everything on the website put together.** When someone in Accra
searches "church near me" or "church in East Legon", Google shows the map listings first. The
website comes after.

Your church already appears on Google Maps with 10 reviews and a 4.3 rating, but the listing
looks unclaimed — there are no opening hours on it.

1. Go to google.com/business and search for "Christian Service Church, Accra".
2. Claim it. Google will post a card or call the church to verify.
3. Once you own it, fill in: all seven service times as opening hours, the website address,
   the phone number, the category "Church", and at least 10 good photos.
4. Ask 10 faithful members to leave an honest review. Reviews are the number one thing Google
   uses to decide which church to show first.

Make sure the name, address and phone on Google are spelled **exactly** the same as on the
website. "Jungle Avenue Road, East Legon, Accra" — the same way every time.

### Step 2 — Put the site on a real domain with HTTPS

Google will not rank a site well without HTTPS (the padlock). Any host — Netlify, Vercel,
Cloudflare Pages or GitHub Pages — gives it free.

**Note:** the sermon videos are about 220MB in total. Some free hosts have limits. If it becomes
a problem, upload the sermons to YouTube and embed them instead. That is better anyway, because
YouTube itself is a search engine and the videos will bring people to you.

### Step 3 — Tell Google the site exists

1. Go to Google Search Console and add your domain.
2. Submit `https://yourdomain.com/sitemap.xml`.
3. Use "URL Inspection" on the homepage and click "Request Indexing".
4. Test your structured data at `search.google.com/test/rich-results` — paste your homepage
   address. It should find Church, FAQPage and BreadcrumbList with no errors.

### Step 4 — Keep it alive

A website that never changes slowly falls down the rankings.

- Update `events.html` every month. The events currently listed run from December 2026 to
  February 2027 — once those dates pass, they make the church look inactive.
- Add a new sermon whenever you have one.
- Add real testimonies as members share them.
- Whenever a service time changes, change it on the site the same week.

### Step 5 — Things worth adding later

- **A blog or "Word for the week" page.** Pages that answer real questions
  ("What is Shiloh Hour?", "What happens at a Ghanaian church service?") bring in people who
  are not yet searching for you by name.
- **A "First time visitor" page** — where to park, what time to arrive, what happens in a
  service, where to take the children. This is one of the most-read pages on any church site.
- **Live streaming** on Facebook or YouTube for members who travel.

---

## 4. New files, and what each one does

| File | What it does |
|---|---|
| `robots.txt` | Tells search engines and AI assistants they may read the site |
| `sitemap.xml` | Lists all 13 pages for Google |
| `llms.txt` | Plain facts file that AI assistants read when answering questions about the church |
| `seo.css` | Styles for the new sections (info boxes, FAQ, map card, times table, footer) |

The JSON-LD structured data sits inside the `<head>` of every `.html` file. If you edit a page,
do not delete the `<script type="application/ld+json">` block.

---

## 5. One honest warning

Good SEO cannot make a church popular. What it does is make sure that when somebody is already
looking for a church in East Legon, they can find you, see the correct time, and know how to get
there.

The things that will actually grow this church online are, in order:
a claimed Google listing with real reviews, correct service times everywhere, real photos of
real services, and real testimonies from real members.

Everything else is support.

