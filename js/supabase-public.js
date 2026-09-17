/* Public content bridge: published Supabase content only. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://uysfgupzlxfhplwqcttp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5c2ZndXB6bHhmaHBsd3FjdHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTUxNTEsImV4cCI6MjEwNTM5MTE1MX0.uAh-0SFwbLVGKA4J62f2blR_18PCUfquJZs0k9pY1Gs';
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const imageStyle = (image) => image ? ` style="background-image: linear-gradient(135deg, rgba(10,26,63,.35), rgba(27,58,139,.5)), url('${esc(image)}')"` : '';

  async function fetchPublished(sb, table, order = 'created_at') {
    const { data, error } = await sb.from(table).select('*').eq('published', true).order(order, { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function renderEvents(items) {
    const mount = document.querySelector('[data-supabase-events]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item) => `
      <article class="event-card reveal">
        <div class="event-card__date"><div class="day">${esc(item.date ? item.date.slice(8, 10) : '')}</div><div class="month">${esc(item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short' }) : '')}</div></div>
        <div class="event-card__body">
          <h3 class="event-card__title">${esc(item.title)}</h3>
          <div class="event-card__meta"><span>${esc(item.time || '')}</span><span>${esc(item.location || '')}</span></div>
          <p class="event-card__desc">${esc(item.body || '')}</p>
        </div>
      </article>`).join('') : '<p class="muted">No published events yet.</p>';
  }

  function renderSermons(items) {
    const mount = document.querySelector('[data-supabase-sermons]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item) => `
      <article class="sermon-card reveal"${imageStyle(item.image)}>
        <div class="sermon-card__media"${imageStyle(item.image)}><div class="sermon-card__play"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg></div></div>
        <div class="sermon-card__body">
          <div class="sermon-card__series">${esc(item.series || 'Sermon')}</div>
          <h3 class="sermon-card__title">${esc(item.title)}</h3>
          <div class="sermon-card__meta"><span>${esc(item.preacher || '')}</span><span>${formatDate(item.date)}</span></div>
          <p class="muted">${esc(item.body || '')}</p>
          <div class="sermon-card__actions">${item.video_url ? `<a class="btn btn-primary btn-sm" href="${esc(item.video_url)}" target="_blank" rel="noopener">Watch</a>` : ''}${item.audio_url ? `<a class="btn btn-outline btn-sm" href="${esc(item.audio_url)}" target="_blank" rel="noopener">Listen</a>` : ''}</div>
        </div>
      </article>`).join('') : '<p class="muted">No published sermons yet.</p>';
  }

  function renderGallery(items) {
    const mount = document.querySelector('[data-gallery-grid]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item) => `
      <article class="gallery-item" data-lightbox="${esc(item.image)}" data-caption="${esc(item.caption || '')}">
        <img src="${esc(item.image)}" alt="${esc(item.caption || 'Christian Service Church gallery photo')}" loading="lazy" decoding="async">
        <div class="gallery-item__overlay">${esc(item.caption || '')}</div>
      </article>`).join('') : '<div class="gallery-empty">No published photos yet.</div>';
    mount.classList.add('is-ready');
  }

  function renderTestimonies(items) {
    const mount = document.querySelector('[data-supabase-testimonies]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item) => `
      <div class="testimonial-slide"><div class="testimonial-card">
        <div class="testimonial-card__quote-mark">"</div>
        <div class="testimonial-card__photo"${imageStyle(item.image)}></div>
        <p class="testimonial-card__text">${esc(item.body || '')}</p>
        <div class="testimonial-card__name">${esc(item.name || '')}</div>
        <div class="testimonial-card__role">${esc(item.title || '')}</div>
      </div></div>`).join('') : '<p class="muted">No published testimonies yet.</p>';
  }

  function renderAnnouncements(items) {
    const mount = document.querySelector('[data-supabase-announcements]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item) => `
      <article class="feature-card reveal">
        ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title || 'Church announcement')}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--r-md);margin-bottom:var(--sp-4)">` : ''}
        <span class="eyebrow">${esc(item.category || 'Announcement')}</span>
        <h2 class="feature-card__title">${esc(item.title)}</h2>
        <p class="feature-card__desc">${esc(item.body)}</p>
        <small class="muted">${formatDate(item.date)}</small>
      </article>`).join('') : '<p class="muted">There are no announcements right now.</p>';
  }

  async function applyPageSettings(sb) {
    const header = document.querySelector('[data-page-key]');
    if (!header) return;
    const { data, error } = await sb.from('pages').select('*').eq('slug', header.dataset.pageKey).eq('published', true).maybeSingle();
    if (error || !data) return;
    const bg = header.querySelector('.page-header__bg, .hero__bg');
    const title = header.querySelector('.page-header__title, .hero__title, h1');
    const subtitle = header.querySelector('.page-header__sub, .hero__tagline, h1 + p');
    if (bg && header.dataset.pageKey === 'home' && data.hero_image) bg.style.backgroundImage = `linear-gradient(135deg, rgba(10,26,63,.5), rgba(27,58,139,.45)), url('${data.hero_image.replace(/'/g, '%27')}')`;
    if (title && data.title) title.textContent = data.title;
    if (subtitle && data.subtitle) subtitle.textContent = data.subtitle;
    if (data.body && !header.nextElementSibling?.matches('.page-managed-copy')) {
      const copy = document.createElement('section');
      copy.className = 'section page-managed-copy';
      copy.innerHTML = '<div class="container"><p class="lead"></p></div>';
      copy.querySelector('p').textContent = data.body;
      header.insertAdjacentElement('afterend', copy);
    }
  }

  async function init() {
    const hasMount = document.querySelector('[data-page-key], [data-supabase-events], [data-supabase-sermons], [data-gallery-grid], [data-supabase-testimonies], [data-supabase-announcements]');
    if (!hasMount) return;
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await applyPageSettings(sb);
      if (document.querySelector('[data-supabase-announcements]')) renderAnnouncements(await fetchPublished(sb, 'announcements', 'date'));
      const { count } = await sb.from('announcements').select('id', { count: 'exact', head: true }).eq('published', true);
      document.querySelectorAll('.nav__announcement-count').forEach((badge) => {
        const total = Number(count || 0);
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.hidden = false;
        badge.parentElement?.setAttribute('aria-label', `Announcements (${total})`);
      });
      if (document.querySelector('[data-supabase-events]')) renderEvents(await fetchPublished(sb, 'events', 'date'));
      if (document.querySelector('[data-supabase-sermons]')) renderSermons(await fetchPublished(sb, 'sermons', 'date'));
      if (document.querySelector('[data-gallery-grid]')) renderGallery(await fetchPublished(sb, 'gallery', 'date'));
      if (document.querySelector('[data-supabase-testimonies]')) renderTestimonies(await fetchPublished(sb, 'testimonies', 'date'));
    } catch (error) {
      console.warn('Published church content is unavailable.', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
