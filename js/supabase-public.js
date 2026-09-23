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

  function normalizeSermonText(value) {
    return String(value ?? '').trim();
  }

  function normalizeSermonLink(value) {
    const text = normalizeSermonText(value);
    if (!text) return '';
    if (/^(https?:|mailto:|tel:|\/|\.\.?\/)/i.test(text)) return text;
    return text;
  }

  function buildSermonActions(item) {
    const watchValue = normalizeSermonLink(item.video_url || item.video_file || item.audio_url || item.download_url || item.url || item.link || '');
    const downloadValue = normalizeSermonLink(item.download_url || item.video_file || item.audio_url || item.video_url || item.url || item.link || '');
    const watchUrl = watchValue || 'https://www.youtube.com/results?search_query=' + encodeURIComponent(item.title || 'Sermon');
    const downloadUrl = downloadValue || watchUrl;
    const addDownloadAttr = /\.(mp3|mp4|m4a|m4v|wav|aac|webm|pdf|zip|doc|docx)$/i.test(downloadUrl) || String(downloadUrl).includes('/storage/v1/object/public/') || String(downloadUrl).includes('/download');

    return {
      watchUrl,
      downloadUrl,
      addDownloadAttr,
      watchLabel: 'Watch Now',
      downloadLabel: 'Download'
    };
  }

  function getSermonSearchText(item) {
    return [
      item.title,
      item.preacher,
      item.series,
      item.body,
      item.summary,
      item.date,
      item.created_at,
      item.scripture,
      item.reference,
      item.speaker
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function getSermonSeriesLabel(item) {
    return normalizeSermonText(item.series) || 'General';
  }

  const sermonLibraryState = {
    allItems: [],
    query: '',
    series: '',
    visibleCount: 8,
    showAll: false
  };

  function updateSermonLibraryMeta(filtered, total) {
    const countNode = document.querySelector('#sermon-results-count');
    const emptyNode = document.querySelector('#sermon-empty-state');
    const seriesTitleNode = document.querySelector('#sermon-series-title');
    const loadMoreBtn = document.querySelector('#sermon-load-more');

    if (countNode) {
      countNode.textContent = `${filtered} of ${total} sermons`;
    }

    if (seriesTitleNode) {
      if (sermonLibraryState.series) {
        seriesTitleNode.textContent = `Series: ${sermonLibraryState.series}`;
        seriesTitleNode.hidden = false;
      } else {
        seriesTitleNode.textContent = 'Latest Sermons';
        seriesTitleNode.hidden = false;
      }
    }

    if (loadMoreBtn) {
      const hasMore = filtered.length > sermonLibraryState.visibleCount;
      loadMoreBtn.hidden = !hasMore;
      loadMoreBtn.textContent = sermonLibraryState.showAll || filtered.length <= sermonLibraryState.visibleCount ? 'Load More' : 'Load More';
    }

    if (emptyNode) {
      const hasNoResults = filtered.length === 0;
      emptyNode.hidden = !hasNoResults;
      if (hasNoResults) {
        const term = sermonLibraryState.query ? ` for "${sermonLibraryState.query}"` : '';
        const message = emptyNode.querySelector('.sermon-empty-state__message');
        if (message) message.textContent = `No sermons found${term}.`;
      }
    }
  }

  function renderSermonLibrary() {
    const mount = document.querySelector('[data-supabase-sermons]');
    if (!mount) return;

    const allItems = [...sermonLibraryState.allItems].sort((a, b) => {
      const aValue = new Date(a.date || a.created_at || 0).getTime();
      const bValue = new Date(b.date || b.created_at || 0).getTime();
      return bValue - aValue;
    });

    let items = allItems.filter((item) => {
      if (sermonLibraryState.series && getSermonSeriesLabel(item) !== sermonLibraryState.series) return false;
      if (!sermonLibraryState.query) return true;
      return getSermonSearchText(item).includes(sermonLibraryState.query.toLowerCase());
    });

    const total = items.length;
    const limit = sermonLibraryState.showAll || total <= 8 ? total : sermonLibraryState.visibleCount;
    const visibleItems = items.slice(0, limit);

    if (!items.length) {
      mount.innerHTML = '';
      updateSermonLibraryMeta(0, total);
      return;
    }

    const shell = document.querySelector('.sermon-empty-shell');
    if (shell) shell.style.display = 'none';

    mount.innerHTML = visibleItems.map((item, index) => {
      const image = normalizeSermonText(item.image || item.thumbnail) || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80';
      const preacher = normalizeSermonText(item.preacher || item.speaker) || 'Pastor';
      const titleText = normalizeSermonText(item.title) || 'Sermon Message';
      const summary = normalizeSermonText(item.body || item.summary) || 'A powerful message to encourage your faith and strengthen your walk with God.';
      const dateText = normalizeSermonText(item.date || item.created_at);
      const displayDate = dateText ? formatDate(dateText) : '';
      const seriesText = getSermonSeriesLabel(item);
      const actions = buildSermonActions(item);
      const isFeatured = index === 0 && !sermonLibraryState.series && !sermonLibraryState.query;

      return `
        <article class="sermon-card ${isFeatured ? 'sermon-card--featured' : 'sermon-card--compact'} reveal">
          <div class="sermon-card__media ${isFeatured ? 'sermon-card__media--featured' : ''}">
            <img src="${esc(image)}" alt="${esc(titleText)}" loading="lazy" decoding="async">
            ${normalizeSermonText(item.duration) ? `<span class="sermon-card__duration">${esc(item.duration)}</span>` : ''}
          </div>

          <div class="sermon-card__body ${isFeatured ? 'sermon-card__body--featured' : ''}">
            <button type="button" class="sermon-card__series" data-series-filter="${esc(seriesText)}">${esc(seriesText)}</button>
            <h3 class="sermon-card__title">${esc(titleText)}</h3>

            <div class="sermon-card__meta">
              <span>${esc(preacher)}</span>
              ${displayDate ? `<span>${displayDate}</span>` : ''}
            </div>

            <p class="sermon-card__summary">${esc(summary)}</p>

            <div class="sermon-card__actions">
              <a class="btn btn-primary btn-block" href="${esc(actions.watchUrl)}" target="_blank" rel="noopener">${esc(actions.watchLabel)}</a>
              <a class="btn btn-outline btn-block" href="${esc(actions.downloadUrl)}" target="_blank" rel="noopener" ${actions.addDownloadAttr ? 'download' : ''}>${esc(actions.downloadLabel)}</a>
            </div>
          </div>
        </article>`;
    }).join('');

    updateSermonLibraryMeta(visibleItems.length, total);

    mount.querySelectorAll('[data-series-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextSeries = button.getAttribute('data-series-filter');
        sermonLibraryState.series = nextSeries || '';
        sermonLibraryState.visibleCount = 8;
        sermonLibraryState.showAll = false;
        renderSermonLibrary();
      });
    });
  }

  function renderSermons(items) {
    const mount = document.querySelector('[data-supabase-sermons]');
    if (!mount) return;

    sermonLibraryState.allItems = Array.isArray(items) ? items : [];
    sermonLibraryState.visibleCount = 8;
    sermonLibraryState.showAll = false;

    const params = new URLSearchParams(window.location.search);
    const initialSeries = params.get('series');
    if (initialSeries) {
      sermonLibraryState.series = decodeURIComponent(initialSeries);
    }

    const controls = document.querySelector('.sermon-library-controls');
    if (controls) {
      const searchInput = document.querySelector('#sermon-search');
      const loadMoreButton = document.querySelector('#sermon-load-more');

      if (searchInput) {
        searchInput.addEventListener('input', (event) => {
          sermonLibraryState.query = event.target.value.trim();
          sermonLibraryState.visibleCount = 8;
          sermonLibraryState.showAll = false;
          renderSermonLibrary();
        });
      }

      if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
          const filteredTotal = sermonLibraryState.allItems.filter((item) => {
            if (sermonLibraryState.series && getSermonSeriesLabel(item) !== sermonLibraryState.series) return false;
            if (!sermonLibraryState.query) return true;
            return getSermonSearchText(item).includes(sermonLibraryState.query.toLowerCase());
          }).length;
          sermonLibraryState.visibleCount = Math.min(filteredTotal, sermonLibraryState.visibleCount + 8);
          sermonLibraryState.showAll = sermonLibraryState.visibleCount >= filteredTotal;
          renderSermonLibrary();
        });
      }
    }

    if (sermonLibraryState.series) {
      const url = new URL(window.location.href);
      url.searchParams.set('series', encodeURIComponent(sermonLibraryState.series));
      window.history.replaceState({}, '', url);
    }

    renderSermonLibrary();
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
    const sorted = [...items].sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());
    mount.innerHTML = sorted.length ? sorted.map((item) => `
      <article class="feature-card reveal" data-announcement-id="${esc(item.id)}" data-created-at="${esc(item.created_at || item.date || '')}" data-announcement-date="${esc(item.date || item.created_at || '')}">
        ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title || 'Church announcement')}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--r-md);margin-bottom:var(--sp-4)">` : ''}
        <span class="eyebrow">${esc(item.category || 'Announcement')}</span>
        <h2 class="feature-card__title">${esc(item.title)}</h2>
        <p class="feature-card__sender">Posted by ${esc(item.sender_name || 'Church office')}${item.sender_role ? `, ${esc(item.sender_role)}` : ''}</p>
        <p class="feature-card__desc">${esc(item.body)}</p>
        <small class="muted">${formatDate(item.date)}</small>
      </article>`).join('') : '<p class="muted">There are no announcements right now.</p>';
    window.dispatchEvent(new CustomEvent('csc-announcements-rendered', { detail: { items: sorted } }));
  }

  function renderLeaders(items) {
    const mount = document.querySelector('[data-supabase-leaders]');
    if (!mount) return;
    const pageSize = 6;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(Math.max(0, Number(window.CSC_LEADERS_PAGE || 0)), pageCount - 1);
    window.CSC_LEADERS_ITEMS = items;
    window.CSC_LEADERS_PAGE = currentPage;
    const visibleItems = items.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    mount.innerHTML = visibleItems.length ? visibleItems.map((item, index) => `
      <div class="member-card reveal-scale" data-delay="${(index % 3) + 1}">
        <div class="member-card__image"${item.image ? imageStyle(item.image) : ''}></div>
        <div class="member-card__content">
          <h3 class="member-card__name">${esc(item.name || '')}</h3>
          <p class="member-card__role">${esc(item.role || '')}</p>
          ${item.location ? `<p class="member-card__location"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-13-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(item.location)}</p>` : ''}
          ${item.body ? `<p class="member-card__bio">${esc(item.body)}</p>` : ''}
        </div>
      </div>`).join('') : '<p class="muted">No leaders have been published yet.</p>';
    const pagination = document.querySelector('[data-leaders-pagination]');
    if (pagination) {
      pagination.hidden = items.length <= pageSize;
      const previous = pagination.querySelector('[data-leaders-page="previous"]');
      const next = pagination.querySelector('[data-leaders-page="next"]');
      const info = pagination.querySelector('[data-leaders-page-info]');
      if (previous) previous.disabled = currentPage === 0;
      if (next) next.disabled = currentPage >= pageCount - 1;
      if (info) info.textContent = items.length ? `Showing ${currentPage * pageSize + 1}-${Math.min((currentPage + 1) * pageSize, items.length)} of ${items.length} leaders` : 'No leaders to show';
    }
  }

  function initLeadersPagination() {
    if (window.CSC_LEADERS_PAGINATION_READY) return;
    window.CSC_LEADERS_PAGINATION_READY = true;
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-leaders-page]');
      if (!button || button.disabled) return;
      const items = window.CSC_LEADERS_ITEMS || [];
      const pageSize = 6;
      const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
      const currentPage = Number(window.CSC_LEADERS_PAGE || 0);
      const nextPage = button.dataset.leadersPage === 'next' ? currentPage + 1 : currentPage - 1;
      if (nextPage < 0 || nextPage >= pageCount) return;
      window.CSC_LEADERS_PAGE = nextPage;
      renderLeaders(items);
      document.querySelector('[data-supabase-leaders]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
      bg.classList.toggle('page-settings-image', Boolean(data.hero_image));
    }
    if (title) title.textContent = data.title || '';
    if (subtitle) subtitle.textContent = data.subtitle || '';
    const applyContentOverrides = () => {
      const overrides = data.content_overrides || {};
      Object.entries(overrides).forEach(([selector, override]) => {
        document.querySelectorAll(selector).forEach((element) => {
          if (override.type === 'src' && override.value) element.setAttribute('src', override.value);
          else if (override.value != null && element.children.length === 0) element.textContent = override.value;
          if (override.href != null && element.tagName.toLowerCase() === 'a') element.setAttribute('href', override.href);
        });
      });
    };
    applyContentOverrides();
    document.addEventListener('csc-footer-ready', applyContentOverrides, { once: true });
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
    const overrides = data.content_overrides || {};
    Object.keys(overrides).forEach((selector) => {
      const element = document.querySelector(selector);
      const override = overrides[selector];
      if (!element || !override) return;
      if (override.type === 'src') element.setAttribute('src', override.value || '');
      else if (override.value != null) element.textContent = override.value;
      if (element.matches('a') && override.href != null) element.setAttribute('href', override.href);
    });
    revealPageSettings();
  }

  async function applyHomepageContent(sb) {
    if (!document.querySelector('[data-home]')) return;
    let result;
    try { result = await sb.from('homepage_content').select('published_content').eq('id', 'home').maybeSingle(); } catch (_) { return; }
    const { data, error } = result;
    if (error || !data?.published_content || !Object.keys(data.published_content).length) return;
    const content = data.published_content;
    const get = (path) => path.split('.').reduce((value, key) => value?.[key], content);
    document.querySelectorAll('[data-home]').forEach((element) => {
      const value = get(element.dataset.home);
      if (value == null) return;
      element.textContent = String(value);
    });
    document.querySelectorAll('[data-home-image]').forEach((element) => {
      const value = get(element.dataset.homeImage);
      if (value) element.src = String(value);
    });
    document.querySelectorAll('[data-home-href]').forEach((element) => {
      const value = get(element.dataset.homeHref);
      if (value) element.href = String(value);
    });
    const hero = content.hero || {};
    const bg = document.querySelector('.hero__bg');
    if (bg && hero.image) bg.style.backgroundImage = `linear-gradient(135deg, rgba(10,26,63,.18), rgba(10,26,63,.06)), url('${String(hero.image).replace(/'/g, '%27')}')`;
    const rows = Array.isArray(content.serviceTimes?.rows) ? content.serviceTimes.rows : [];
    const rowMount = document.querySelector('[data-home-service-rows]');
    if (rowMount && rows.length) rowMount.innerHTML = rows.map((row, index) => `<tr${index === 0 ? ' class="is-main"' : ''}><td class="day">${esc(row.day)}</td><td>${esc(row.meeting)}</td><td class="time">${esc(row.time)}</td></tr>`).join('');
    const phone = document.querySelector('[data-home="info.phoneValue"] a');
    if (phone && content.info?.phoneValue) { phone.textContent = content.info.phoneValue; phone.href = `tel:${String(content.info.phoneValue).replace(/[^+\d]/g, '')}`; }
    const map = document.querySelector('[data-home-map]');
    if (map && content.location?.mapEmbed) map.src = content.location.mapEmbed;
    ['facebook', 'instagram', 'tiktok', 'whatsapp'].forEach((network) => {
      const link = document.querySelector(`.social-icon--${network}`);
      if (link && content.social?.[network]) link.href = content.social[network];
    });
    const tiles = document.querySelectorAll('.quick-tile');
    (content.explore?.items || []).forEach((item, index) => { if (tiles[index]?.querySelector('.quick-tile__title')) { tiles[index].href = item.url || tiles[index].href; } });
    const beliefCards = document.querySelectorAll('.feature-card');
    (content.beliefsCards?.items || []).forEach((item, index) => { const card = beliefCards[index]; if (!card) return; const title = card.querySelector('.feature-card__title'), body = card.querySelector('.feature-card__desc'); if (title) title.textContent = item.title || ''; if (body) body.textContent = item.body || ''; });
    const faqItems = document.querySelectorAll('.faq-item');
    (content.faqs?.items || []).forEach((item, index) => { const faq = faqItems[index]; if (!faq) return; const question = faq.querySelector('.faq-item__q'), answer = faq.querySelector('.faq-item__a > div'); if (question) question.firstChild.textContent = item.question || ''; if (answer) answer.textContent = item.answer || ''; });
  }

  async function init() {
    initLeadersPagination();
    const hasMount = document.querySelector('[data-page-key], [data-supabase-events], [data-supabase-sermons], [data-gallery-grid], [data-supabase-testimonies], [data-supabase-announcements], [data-supabase-leaders], [data-supabase-ministries], [data-prayer-form]');
    if (!hasMount) return;

    document.querySelectorAll('[data-supabase-events], [data-supabase-sermons], [data-supabase-leaders], [data-supabase-ministries], [data-supabase-announcements]').forEach((mount) => { mount.innerHTML = '<p class="muted">Loading...</p>'; });
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      const sb = window.CSC_SUPABASE || window.supabase.createClient(SUPABASE_URL, 'sb_publishable_5T68Teyy88wmJUlckVRneA_Yfh0OKZV');
      window.CSC_SUPABASE = sb;
      await applyPageSettings(sb);
      if (document.querySelector('[data-home]')) await applyHomepageContent(sb);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
          if (document.querySelector('[data-supabase-events]')) renderEvents(await fetchPublished(sb, 'events', 'date'));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sermons' }, async () => {
          if (document.querySelector('[data-supabase-sermons]')) renderSermons(await fetchPublished(sb, 'sermons', 'date'));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, async () => {
          if (document.querySelector('[data-gallery-grid]')) renderGallery(await fetchPublished(sb, 'gallery', 'date'));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonies' }, async () => {
          if (document.querySelector('[data-supabase-testimonies]')) renderTestimonies(await fetchPublished(sb, 'testimonies', 'date'));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaders' }, async () => renderLeaders(await fetchPublished(sb, 'leaders', 'created_at')))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ministries' }, async () => renderMinistries(await fetchPublished(sb, 'ministries', 'created_at')))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async () => applyPageSettings(sb))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_content' }, async () => applyHomepageContent(sb))
        .subscribe();
    } catch (error) {
      console.warn('Published church content is unavailable.', error);
      revealPageSettings();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('csc-footer-ready', () => {
    if (window.CSC_SUPABASE) applyHomepageContent(window.CSC_SUPABASE);
  });
})();
