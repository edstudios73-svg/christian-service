/* Gallery photo viewer: open a photo full screen, swipe or arrow through the gallery, share the gallery link, download the photo. */
(function () {
  'use strict';

  const GALLERY_URL = 'https://www.christianservicechurch.org/gallery.html';
  const SHARE_TITLE = 'Christian Service Church Gallery';
  const ICON = {
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>'
  };

  let viewer;
  let photos = [];
  let current = 0;
  let lastFocus = null;
  let toastTimer;

  const slug = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

  function collect() {
    photos = Array.from(document.querySelectorAll('[data-lightbox]')).map((el) => ({
      src: el.getAttribute('data-lightbox'),
      caption: el.getAttribute('data-caption') || ''
    }));
  }

  function build() {
    if (viewer) return;
    viewer = document.createElement('div');
    viewer.className = 'viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Photo viewer');
    viewer.innerHTML = `
      <div class="viewer__top">
        <span class="viewer__count" aria-live="polite"></span>
        <button class="viewer__btn viewer__close" type="button" aria-label="Close photo">${ICON.close}</button>
      </div>
      <button class="viewer__btn viewer__nav viewer__nav--prev" type="button" aria-label="Previous photo">${ICON.prev}</button>
      <figure class="viewer__stage"><img class="viewer__img" alt="" decoding="async"></figure>
      <button class="viewer__btn viewer__nav viewer__nav--next" type="button" aria-label="Next photo">${ICON.next}</button>
      <div class="viewer__bottom">
        <p class="viewer__caption"></p>
        <div class="viewer__actions">
          <button class="viewer__action" type="button" data-viewer="share">${ICON.share}<span>Share</span></button>
          <button class="viewer__action viewer__action--gold" type="button" data-viewer="download">${ICON.download}<span>Download</span></button>
        </div>
      </div>
      <div class="viewer__sheet" hidden>
        <p class="viewer__sheet-title">Share the gallery</p>
        <a class="viewer__share" data-share="whatsapp" target="_blank" rel="noopener">WhatsApp</a>
        <a class="viewer__share" data-share="facebook" target="_blank" rel="noopener">Facebook</a>
        <a class="viewer__share" data-share="x" target="_blank" rel="noopener">X</a>
        <button class="viewer__share" data-share="copy" type="button">${ICON.link}<span>Copy link</span></button>
        <button class="viewer__sheet-close" type="button" data-viewer="closesheet">Cancel</button>
      </div>
      <div class="viewer__toast" role="status" aria-live="polite"></div>`;
    document.body.appendChild(viewer);

    viewer.addEventListener('click', (event) => {
      const t = event.target;
      if (t.closest('.viewer__close') || t === viewer || t.classList.contains('viewer__stage')) return close();
      if (t.closest('.viewer__nav--prev')) return step(-1);
      if (t.closest('.viewer__nav--next')) return step(1);
      const action = t.closest('[data-viewer]');
      if (action) {
        const name = action.dataset.viewer;
        if (name === 'share') return share();
        if (name === 'download') return download();
        if (name === 'closesheet') return toggleSheet(false);
      }
      const option = t.closest('[data-share]');
      if (option && option.dataset.share === 'copy') return copyLink();
    });

    let startX = 0, startY = 0;
    viewer.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; startY = event.touches[0].clientY; }, { passive: true });
    viewer.addEventListener('touchend', (event) => {
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (!viewer.classList.contains('is-open')) return;
      if (event.key === 'Escape') { if (!viewer.querySelector('.viewer__sheet').hidden) toggleSheet(false); else close(); }
      else if (event.key === 'ArrowRight') step(1);
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'Tab') trapFocus(event);
    });
  }

  function trapFocus(event) {
    const focusable = Array.from(viewer.querySelectorAll('button:not([hidden]), a[href], a[data-share]')).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function render() {
    const photo = photos[current];
    if (!photo) return;
    const img = viewer.querySelector('.viewer__img');
    img.alt = photo.caption || 'Christian Service Church photo';
    img.src = photo.src;
    viewer.querySelector('.viewer__caption').textContent = photo.caption;
    viewer.querySelector('.viewer__count').textContent = `${current + 1} / ${photos.length}`;
    const single = photos.length < 2;
    viewer.querySelectorAll('.viewer__nav').forEach((btn) => { btn.hidden = single; });
    // warm up the neighbours so the next swipe is instant
    [current + 1, current - 1].forEach((i) => {
      const n = photos[(i + photos.length) % photos.length];
      if (n && n !== photo) { const pre = new Image(); pre.decoding = 'async'; pre.src = n.src; }
    });
  }

  function open(index) {
    build();
    collect();
    if (!photos.length) return;
    current = Math.min(Math.max(0, index), photos.length - 1);
    lastFocus = document.activeElement;
    render();
    toggleSheet(false);
    viewer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    viewer.querySelector('.viewer__close').focus({ preventScroll: true });
  }

  function close() {
    viewer.classList.remove('is-open');
    toggleSheet(false);
    document.body.style.overflow = '';
    viewer.querySelector('.viewer__img').removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function step(delta) {
    if (photos.length < 2) return;
    current = (current + delta + photos.length) % photos.length;
    render();
  }

  function toast(message) {
    const el = viewer.querySelector('.viewer__toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  function shareText() {
    const caption = (photos[current] && photos[current].caption) || '';
    return caption ? `${caption}. See more photos from Christian Service Church:` : 'See photos from Christian Service Church:';
  }

  function toggleSheet(show) {
    const sheet = viewer.querySelector('.viewer__sheet');
    sheet.hidden = !show;
    if (show) {
      const text = encodeURIComponent(shareText());
      const url = encodeURIComponent(GALLERY_URL);
      sheet.querySelector('[data-share="whatsapp"]').href = `https://wa.me/?text=${text}%20${url}`;
      sheet.querySelector('[data-share="facebook"]').href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      sheet.querySelector('[data-share="x"]').href = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      sheet.querySelector('a').focus({ preventScroll: true });
    }
  }

  // Always shares the link to the church's gallery page, never the photo file itself
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: shareText(), url: GALLERY_URL });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    toggleSheet(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(GALLERY_URL);
    } catch (_) {
      const field = document.createElement('input');
      field.value = GALLERY_URL;
      document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); } catch (__) {}
      field.remove();
    }
    toggleSheet(false);
    toast('Link copied');
  }

  async function download() {
    const photo = photos[current];
    if (!photo) return;
    const base = `christian-service-church-${slug(photo.caption) || `photo-${current + 1}`}`;
    try {
      const response = await fetch(photo.src, { mode: 'cors' });
      if (!response.ok) throw new Error('bad response');
      const blob = await response.blob();
      const type = (blob.type || 'image/jpeg').split('/')[1] || 'jpeg';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${base}.${type.replace('jpeg', 'jpg').replace(/\+.*/, '')}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Download started');
    } catch (_) {
      // Cross-site photos that block direct download open in a new tab, where it can be saved
      const link = document.createElement('a');
      link.href = photo.src;
      link.download = base;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('Photo opened. Press and hold it to save.');
    }
  }

  function itemFrom(target) {
    const el = target.closest && target.closest('[data-lightbox]');
    return el || null;
  }

  // The gallery is rebuilt after the page loads, so clicks are handled for the whole page
  document.addEventListener('click', (event) => {
    const item = itemFrom(event.target);
    if (!item) return;
    event.preventDefault();
    collect();
    open(Array.from(document.querySelectorAll('[data-lightbox]')).indexOf(item));
  });
  document.addEventListener('keydown', (event) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || (viewer && viewer.classList.contains('is-open'))) return;
    const item = itemFrom(event.target);
    if (!item || event.target !== item) return;
    event.preventDefault();
    collect();
    open(Array.from(document.querySelectorAll('[data-lightbox]')).indexOf(item));
  });
})();
