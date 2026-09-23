/* ==========================================================================
   Navigation sticky transparent-to-solid, hamburger, full-screen menu
   ========================================================================== */
(function () {
  'use strict';

  // Only initialize GA when the site explicitly sets a valid measurement ID.
  // Leaving this empty prevents accidental tracking with a stale value.
  window.CSC_GA_MEASUREMENT_ID = window.CSC_GA_MEASUREMENT_ID || '';

  const NAV_LINKS = [
    { href: 'index.html', label: 'Home', icon: 'home' },
    { href: 'about.html', label: 'About', icon: 'info' },
    { href: 'pastor.html', label: 'Our Pastor', icon: 'user' },
    { href: 'ministries.html', label: 'Ministries', icon: 'heart' },
    { href: 'gallery.html', label: 'Gallery', icon: 'image' },
    { href: 'members.html', label: 'Our Leaders', icon: 'user' },
    { href: 'sermons.html', label: 'Sermons', icon: 'play' },
    { href: 'events.html', label: 'Events', icon: 'calendar' },
    { href: 'prayer.html', label: 'Prayer', icon: 'pray' },
    { href: 'giving.html', label: 'Giving', icon: 'gift' },
    { href: 'announcements.html', label: 'Announcements', icon: 'megaphone' },
    { href: 'contact.html', label: 'Visit', icon: 'phone' },
    { href: 'testimonies.html', label: 'Testimonies', icon: 'quote' },
  ];

  const ICONS = {
    home:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    info:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    user:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    heart:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    play:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    image:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    quote:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    pray:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6m0 14V8m-4 0a4 4 0 0 1 8 0M8 8v8m8-8v8"/></svg>',
    gift:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    phone:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
      file:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h11l5 5v13H4z"/><path d="M15 3v6h5M8 13h8M8 17h6"/></svg>',
  };

  const ICON_SIZE = 'width="20" height="20"';

  function iconSvg(name) {
    const raw = ICONS[name] || ICONS.info;
    return raw.replace('<svg ', `<svg ${ICON_SIZE} `);
  }

  function getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path === '' ? 'index.html' : path;
  }

  function buildDesktopHeader(currentPage) {
    const desktopPages = [
      { href: 'index.html', label: 'Home' },
      { href: 'about.html', label: 'About' },
      { href: 'contact.html', label: 'Visit' },
      { href: 'sermons.html', label: 'Sermons' },
      { href: 'testimonies.html', label: 'Testimonies' }
    ];
    const desktopLinks = desktopPages.map((link) => {
      const active = currentPage === link.href ? ' is-active' : '';
      return `<a href="${link.href}" class="csc-dh__link${active}">${link.label}</a>`;
    }).join('');

    const header = document.createElement('header');
    header.className = 'csc-dh';
    header.id = 'cscDesktopHeader';
    header.setAttribute('aria-label', 'Main header');
    header.hidden = true;
    header.innerHTML = `
      <div class="csc-dh__inner">
        <div class="csc-dh__brand" aria-label="Christian Service Church home">
          <span class="csc-dh__logo">
            <img src="assets/church-logo.png" alt="Christian Service Church logo" loading="eager">
          </span>
          <span class="csc-dh__divider" aria-hidden="true"></span>
          <span class="csc-dh__name">
            <span>Christian Service</span>
            <small>CHURCH</small>
          </span>
        </div>

        <nav class="csc-dh__nav" aria-label="Primary navigation">
          ${desktopLinks}
        </nav>

        <div class="csc-dh__actions" aria-label="Quick actions">
          <a href="announcements.html" class="csc-dh__bell" aria-label="Announcements" title="Announcements">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/>
              <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>
            </svg>
            <span class="csc-dh__badge nav__announcement-count" aria-live="polite" aria-atomic="true" hidden>0</span>
          </a>
          <span class="csc-dh__divider csc-dh__divider--action" aria-hidden="true"></span>
          <a href="giving.html" class="csc-dh__give" data-nav-give>Give</a>
        </div>
      </div>
    `;
    return header;
  }

  function buildNav() {
    const nav = document.createElement('nav');
    nav.className = 'nav nav--solid';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = `
      <div class="nav__inner">
        <a href="index.html" class="nav__logo" aria-label="Christian Service Church home">
          <span class="nav__logo-mark">
            <img src="assets/church-logo.png" alt="Christian Service Church logo" loading="eager">
          </span>
          <span class="nav__logo-text">
            Christian Service
            <small>CHURCH</small>
          </span>
        </a>
        <div class="nav__actions">
          <div class="nav__links" aria-label="Quick links">
            <a href="index.html" class="nav__link is-active">Home</a>
            <a href="contact.html" class="nav__link">Visit</a>
            <a href="giving.html" class="nav__link">Give</a>
            <a href="sermons.html" class="nav__link">Sermons</a>
            <a href="testimonies.html" class="nav__link">Testimonies</a>
          </div>
          <a href="announcements.html" class="nav__icon-button nav__announcement-link${getCurrentPage() === 'announcements.html' ? ' is-active' : ''}" aria-label="Announcements" title="Announcements">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>
            <span class="nav__announcement-count" aria-live="polite" aria-atomic="true" hidden>0</span>
          </a>
          <a href="giving.html" class="nav__cta" data-nav-give>Give</a>
          <button class="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    `;
    return nav;
  }

  function buildQuickBar(current) {
    const bar = document.createElement('div');
    bar.className = 'mobile-quickbar';
    bar.innerHTML = `
      <div class="mobile-quickbar__inner">
        <a href="index.html" class="mobile-quickbar__link${current === 'index.html' ? ' is-active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </a>
        <a href="contact.html" class="mobile-quickbar__link${current === 'contact.html' ? ' is-active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>Visit</span>
        </a>
        <a href="giving.html" class="mobile-quickbar__link${current === 'giving.html' ? ' is-active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
          <span>Give</span>
        </a>
        <a href="sermons.html" class="mobile-quickbar__link${current === 'sermons.html' ? ' is-active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Sermons</span>
        </a>
        <a href="testimonies.html" class="mobile-quickbar__link${current === 'testimonies.html' ? ' is-active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
          <span>Testimonies</span>
        </a>
      </div>
    `;
    return bar;
  }

  function buildMenu(current) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobileMenu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Site menu');

    const linksHtml = NAV_LINKS.map((l) => {
      const active = l.href === current ? ' is-active' : '';
      return `<a href="${l.href}" class="mobile-menu__link${active}">
        <span style="display:flex;align-items:center;gap:14px">
          <span style="width:24px;display:grid;place-items:center;opacity:0.6">${iconSvg(l.icon)}</span>
          ${l.label}
        </span>
      </a>`;
    }).join('');

    menu.innerHTML = `
      <div class="mobile-menu__topbar">
        <div class="mobile-menu__eyebrow">Explore</div>
        <button class="mobile-menu__close" type="button" aria-label="Close menu">Close</button>
      </div>
      <nav class="mobile-menu__nav">${linksHtml}</nav>
      <div class="mobile-menu__cta">
        <a href="contact.html" class="btn btn-gold btn-lg btn-block">Plan Your Visit</a>
      </div>
      <div class="mobile-menu__verse">
        "For where two or three gather in my name, there am I with them."
        <br><strong>Matthew 18:20</strong>
      </div>
    `;
    return menu;
  }

  function initInstallPrompt() {
    let installEvent = null;
    let showTimer = null;
    const INSTALL_DELAY_MS = 60000;
    const installed = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const prompt = document.createElement('aside');
    prompt.className = 'install-prompt';
    prompt.setAttribute('aria-label', 'Install Christian Service Church app');
    prompt.innerHTML = `
      <div class="install-prompt__icon"><img src="assets/church-logo.png" alt=""></div>
      <div class="install-prompt__copy"><strong>Install as app</strong><span>Install Christian Service Church as a classic app on your device.</span></div>
      <button class="install-prompt__close" type="button" aria-label="Dismiss install prompt">&times;</button>
      <button class="btn btn-gold btn-sm install-prompt__install" type="button">Install</button>`;

    const show = () => {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem('csc-install-dismissed') === '1'; } catch (_) {}
      if (installed() || dismissed) return;
      if (!document.body.contains(prompt)) document.body.appendChild(prompt);
      requestAnimationFrame(() => prompt.classList.add('is-visible'));
    };

    const close = () => {
      prompt.classList.remove('is-visible');
      try { sessionStorage.setItem('csc-install-dismissed', '1'); } catch (_) {}
    };

    const scheduleShow = () => {
      if (showTimer || installed()) return;
      showTimer = window.setTimeout(() => {
        showTimer = null;
        show();
      }, INSTALL_DELAY_MS);
    };

    prompt.querySelector('.install-prompt__close').addEventListener('click', close);
    prompt.querySelector('.install-prompt__install').addEventListener('click', async () => {
      if (!installEvent) return close();
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      installEvent = null;
      if (choice.outcome === 'accepted') close();
    });

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installEvent = event;
      scheduleShow();
    });
    window.addEventListener('appinstalled', () => {
      installEvent = null;
      if (showTimer) window.clearTimeout(showTimer);
      showTimer = null;
      close();
    });
    scheduleShow();
  }

  function registerApp() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});

    const gaScript = document.createElement('script');
    gaScript.src = 'js/ga4.js';
    gaScript.defer = true;
    document.head.appendChild(gaScript);

    if (!document.querySelector('script[data-notifications]')) {
      const config = document.createElement('script');
      config.src = 'js/push-config.js';
      config.dataset.notifications = 'config';
      config.onload = () => {
        const script = document.createElement('script');
        script.src = 'js/notifications.js';
        script.dataset.notifications = 'client';
        document.body.appendChild(script);
      };
      document.head.appendChild(config);
    }
  }

  function init() {
    const header = document.querySelector('[data-nav-mount]') || document.body;
    const current = getCurrentPage();
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const syncDesktopHeader = () => {
      const activeHeader = document.getElementById('cscDesktopHeader');
      if (!desktopQuery.matches) {
        if (activeHeader) activeHeader.remove();
        return;
      }
      if (!activeHeader) {
        const newDesktopHeader = buildDesktopHeader(current);
        header.prepend(newDesktopHeader);
        return;
      }
      activeHeader.hidden = false;
    };

    if (!desktopQuery.matches) {
      const existingDesktopHeader = document.getElementById('cscDesktopHeader');
      if (existingDesktopHeader) existingDesktopHeader.remove();
    } else {
      const desktopHeader = buildDesktopHeader(current);
      header.prepend(desktopHeader);
    }

    syncDesktopHeader();
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', syncDesktopHeader);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(syncDesktopHeader);
    }

    const nav = buildNav();
    const menu = buildMenu(current);
    const quickBar = buildQuickBar(current);
    header.prepend(nav);
    document.body.appendChild(menu);
    document.body.appendChild(quickBar);

    const hamburger = nav.querySelector('.hamburger');
    const giveBtn = nav.querySelector('[data-nav-give]');

    // Show Give button only on larger small-screens
    if (window.innerWidth >= 390) giveBtn.style.display = '';

    // Toggle menu
    let menuOpen = false;
    function setMenu(open) {
      menuOpen = open;
      hamburger.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    hamburger.addEventListener('click', () => setMenu(!menuOpen));
    menu.querySelector('.mobile-menu__close')?.addEventListener('click', () => setMenu(false));

    // Close menu on link click (links navigate anyway, but for same-page anchors)
    menu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setMenu(false));
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) setMenu(false);
    });

    // Close on backdrop tap (the menu covers full screen; tapping the very top nav area should close)
    menu.addEventListener('click', (e) => {
      if (e.target === menu) setMenu(false);
    });

    nav.classList.remove('nav--transparent');
    nav.classList.add('nav--solid');

    initInstallPrompt();
    registerApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
