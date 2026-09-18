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
  const revealPageSettings = () => document.querySelector('[data-page-key]')?.classList.add('page-settings-ready');

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
          ${item.image ? `<img class="event-card__image" src="${esc(item.image)}" alt="${esc(item.title || 'Church event')}" loading="lazy" decoding="async">` : ''}
          <h3 class="event-card__title">${esc(item.title)}</h3>
          <div class="event-card__meta"><span>${esc(item.time || '')}</span><span>${esc(item.location || '')}</span></div>
          <p class="event-card__desc">${esc(item.body || '')}</p>
        </div>
      </article>`).join('') : '<p class="muted">No published events yet.</p>';
  }

  function renderEmptySermonsState() {
    const mount = document.querySelector('[data-supabase-sermons]');
    if (!mount) return;
    mount.innerHTML = '';
    const shell = document.querySelector('.sermon-empty-shell');
    if (shell) shell.style.display = 'block';
  }

  function renderSermons(items) {
    const mount = document.querySelector('[data-supabase-sermons]');
    if (!mount) return;

    if (!items.length) {
      mount.innerHTML = '';
      const shell = document.querySelector('.sermon-empty-shell');
      if (shell) shell.style.display = 'block';
      return;
    }

    mount.innerHTML = items.map((item) => `
      <article class="sermon-card reveal"${imageStyle(item.image)}>
        <div class="sermon-card__media"${imageStyle(item.image)}>${item.video_file ? `<video controls preload="metadata" src="${esc(item.video_file)}"></video>` : '<div class="sermon-card__play"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg></div>'}</div>
        <div class="sermon-card__body">
          <div class="sermon-card__series">${esc(item.series || 'Sermon')}</div>
          <h3 class="sermon-card__title">${esc(item.title)}</h3>
          <div class="sermon-card__meta"><span>${esc(item.preacher || '')}</span><span>${formatDate(item.date)}</span></div>
          <p class="muted">${esc(item.body || '')}</p>
          <div class="sermon-card__actions">${item.video_url ? `<a class="btn btn-primary btn-sm" href="${esc(item.video_url)}" target="_blank" rel="noopener">Watch</a>` : ''}${item.video_file ? `<a class="btn btn-primary btn-sm" href="${esc(item.video_file)}" target="_blank" rel="noopener">Open video</a>` : ''}${item.audio_url ? `<a class="btn btn-outline btn-sm" href="${esc(item.audio_url)}" target="_blank" rel="noopener">Listen</a>` : ''}</div>
        </div>
      </article>`).join('');
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
      <article class="feature-card reveal" data-announcement-id="${esc(item.id)}">
        ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title || 'Church announcement')}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--r-md);margin-bottom:var(--sp-4)">` : ''}
        <span class="eyebrow">${esc(item.category || 'Announcement')}</span>
        <h2 class="feature-card__title">${esc(item.title)}</h2>
        <p class="feature-card__sender">Posted by ${esc(item.sender_name || 'Church office')}${item.sender_role ? `, ${esc(item.sender_role)}` : ''}</p>
        <p class="feature-card__desc">${esc(item.body)}</p>
        <small class="muted">${formatDate(item.date)}</small>
      </article>`).join('') : '<p class="muted">There are no announcements right now.</p>';
  }

  function renderLeaders(items) {
    const mount = document.querySelector('[data-supabase-leaders]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item, index) => `
      <div class="member-card reveal-scale" data-delay="${(index % 3) + 1}">
        <div class="member-card__image"${item.image ? imageStyle(item.image) : ''}></div>
        <div class="member-card__content">
          <h3 class="member-card__name">${esc(item.name || '')}</h3>
          <p class="member-card__role">${esc(item.role || '')}</p>
          ${item.location ? `<p class="member-card__location"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-13-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(item.location)}</p>` : ''}
          ${item.body ? `<p class="member-card__bio">${esc(item.body)}</p>` : ''}
        </div>
      </div>`).join('') : '<p class="muted">No leaders have been published yet.</p>';
  }

  function renderMinistries(items) {
    const mount = document.querySelector('[data-supabase-ministries]');
    if (!mount) return;
    mount.innerHTML = items.length ? items.map((item, index) => `
      <article class="ministry-card reveal" data-delay="${(index % 2) + 1}">
        <div class="ministry-card__media"${imageStyle(item.image)}></div>
        <div class="ministry-card__body"><h3 class="ministry-card__title">${esc(item.title)}</h3><p class="ministry-card__desc">${esc(item.body || '')}</p>${item.link ? `<a href="${esc(item.link)}" class="ministry-card__link">Learn More</a>` : ''}</div>
      </article>`).join('') : '<p class="muted">No ministries have been published yet.</p>';
  }

  function updateAnnouncementBadge(total) {
    document.querySelectorAll('.nav__announcement-count').forEach((badge) => {
      const hasAnnouncements = total > 0;
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.hidden = !hasAnnouncements;
      badge.parentElement?.setAttribute('aria-label', hasAnnouncements ? `Announcements (${total})` : 'Announcements');
    });
    if (typeof navigator.setAppBadge === 'function') {
      const result = total > 0 ? navigator.setAppBadge(total) : (typeof navigator.clearAppBadge === 'function' ? navigator.clearAppBadge() : null);
      if (result?.catch) result.catch(() => {});
    }
  }

  async function initPrayerForm(sb) {
    const form = document.querySelector('[data-prayer-form]');
    if (!form || form.dataset.supabaseReady) return;
    form.dataset.supabaseReady = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = form.querySelector('button[type="submit"]');
      const values = (selector) => form.querySelector(selector)?.value.trim() || '';
      button.disabled = true;
      const { error } = await sb.from('prayers').insert({
        name: values('[data-prayer-name]'),
        contact: [values('[data-prayer-email]'), values('[data-prayer-phone]')].filter(Boolean).join(' | '),
        body: values('[data-prayer-request]'),
        status: 'New',
        date: new Date().toISOString().slice(0, 10)
      });
      button.disabled = false;
      if (error) {
        button.insertAdjacentHTML('afterend', `<p class="form-hint" role="alert">We could not send your request. Please try again.</p>`);
        return;
      }
      const success = form.querySelector('.form-success');
      const card = form.querySelector('.form-card__inner');
      if (card) card.style.display = 'none';
      if (success) success.classList.add('is-shown');
    }, { once: false });
  }

  async function initVisitForm(sb) {
    const form = document.querySelector('[data-visit-form]');
    if (!form || form.dataset.supabaseReady) return;
    form.dataset.supabaseReady = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = form.querySelector('button[type="submit"]');
      const value = (name) => form.elements[name]?.value.trim() || '';
      const visitTime = form.querySelector('.chip.is-selected')?.textContent.trim() || '';
      button.disabled = true;
      const { error } = await sb.from('visit_messages').insert({
        first_name: value('first_name'), last_name: value('last_name'), email: value('email'),
        phone: value('phone'), subject: value('subject'), message: value('message'), visit_time: visitTime, status: 'New'
      });
      button.disabled = false;
      if (error) {
        button.insertAdjacentHTML('afterend', '<p class="form-hint" role="alert">We could not send your visit message. Please try again.</p>');
        return;
      }
      const card = form.querySelector('.form-card__inner');
      const success = form.querySelector('.form-success');
      if (card) card.style.display = 'none';
      if (success) success.classList.add('is-shown');
    }, { once: false });
  }

  async function applyPageSettings(sb) {
    const header = document.querySelector('[data-page-key]');
    if (!header) return;
    const { data, error } = await sb.from('pages').select('*').eq('slug', header.dataset.pageKey).eq('published', true).maybeSingle();
    if (error || !data) {
      revealPageSettings();
      return;
    }
    const bg = header.querySelector('.page-header__bg, .hero__bg') || header;
    const title = header.querySelector('.page-header__title, .hero__title, h1');
    const subtitle = header.querySelector('.page-header__sub, .hero__tagline, h1 + p');
    if (bg) {
      bg.style.backgroundImage = data.hero_image
        ? `linear-gradient(135deg, rgba(10,26,63,.5), rgba(27,58,139,.45)), url('${data.hero_image.replace(/'/g, '%27')}')`
        : '';
      if (data.hero_image) bg.classList.add('page-settings-image');
    }
    if (title) title.textContent = data.title || '';
    if (subtitle) subtitle.textContent = data.subtitle || '';
    let copy = header.nextElementSibling?.matches('.page-managed-copy') ? header.nextElementSibling : null;
    if (data.body) {
      if (!copy) {
        copy = document.createElement('section');
        copy.className = 'section page-managed-copy';
        copy.innerHTML = '<div class="container"><p class="lead"></p></div>';
        header.insertAdjacentElement('afterend', copy);
      }
      copy.querySelector('p').textContent = data.body;
    } else if (copy) {
      copy.remove();
    }
    revealPageSettings();
  }

  async function init() {
    const hasMount = document.querySelector('[data-page-key], [data-supabase-events], [data-supabase-sermons], [data-gallery-grid], [data-supabase-testimonies], [data-supabase-announcements], [data-supabase-leaders], [data-supabase-ministries], [data-prayer-form]');
    if (!hasMount) return;

    const sermonArchivePage = /\/sermons\.html$/i.test(window.location.pathname) || document.querySelector('[data-page-key="sermons"]');
    if (sermonArchivePage) {
      renderEmptySermonsState();
      return;
    }

    document.querySelectorAll('[data-supabase-events], [data-supabase-sermons], [data-supabase-leaders], [data-supabase-ministries], [data-supabase-announcements]').forEach((mount) => { mount.innerHTML = '<p class="muted">Loading...</p>'; });
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
        const sb = window.supabase.createClient(SUPABASE_URL, 'sb_publishable_5T68Teyy88wmJUlckVRneA_Yfh0OKZV');
      window.CSC_SUPABASE = sb;
      await applyPageSettings(sb);
      if (document.querySelector('[data-supabase-announcements]')) renderAnnouncements(await fetchPublished(sb, 'announcements', 'date'));
      if (document.querySelector('[data-supabase-events]')) renderEvents(await fetchPublished(sb, 'events', 'date'));
      if (document.querySelector('[data-supabase-sermons]')) renderSermons(await fetchPublished(sb, 'sermons', 'date'));
      if (document.querySelector('[data-gallery-grid]')) renderGallery(await fetchPublished(sb, 'gallery', 'date'));
      if (document.querySelector('[data-supabase-testimonies]')) renderTestimonies(await fetchPublished(sb, 'testimonies', 'date'));
      if (document.querySelector('[data-supabase-leaders]')) renderLeaders(await fetchPublished(sb, 'leaders', 'created_at'));
      if (document.querySelector('[data-supabase-ministries]')) renderMinistries(await fetchPublished(sb, 'ministries', 'created_at'));
      await initPrayerForm(sb);
        await initVisitForm(sb);
      sb.channel('public-site-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, async () => {
          if (document.querySelector('[data-supabase-announcements]')) renderAnnouncements(await fetchPublished(sb, 'announcements', 'date'));
          window.CSC_NOTIFICATIONS?.updateUnreadAnnouncementBadge?.();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaders' }, async () => renderLeaders(await fetchPublished(sb, 'leaders', 'created_at')))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ministries' }, async () => renderMinistries(await fetchPublished(sb, 'ministries', 'created_at')))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async () => applyPageSettings(sb))
        .subscribe();
    } catch (error) {
      console.warn('Published church content is unavailable.', error);
      revealPageSettings();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
