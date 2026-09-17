/* ==========================================================================
   Animations — IntersectionObserver reveals, particles, counters, parallax
   ========================================================================== */
(function () {
  'use strict';

  // ---------- Reveal on scroll ----------
  function initReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => io.observe(el));
  }

  // ---------- Floating particles in hero ----------
  function initParticles() {
    const container = document.querySelector('.particles');
    if (!container) return;
    const count = window.innerWidth < 380 ? 14 : 22;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      const size = Math.random() * 4 + 2;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.bottom = Math.random() * 60 + '%';
      p.style.animationDuration = (Math.random() * 8 + 6) + 's';
      p.style.animationDelay = (Math.random() * 6) + 's';
      p.style.opacity = String(Math.random() * 0.5 + 0.2);
      frag.appendChild(p);
    }
    container.appendChild(frag);
  }

  // ---------- Animated counters ----------
  function animateCounter(el) {
    const target = parseFloat(el.getAttribute('data-count') || '0');
    const suffix = el.getAttribute('data-suffix') || '';
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const duration = 1800;
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.firstChild ? (el.childNodes[0].nodeValue = val.toFixed(decimals)) : (el.textContent = val.toFixed(decimals));
      el.querySelector('.suffix') ? (el.querySelector('.suffix').textContent = suffix) : null;
      // simpler: set text
      const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
      el.innerHTML = formatted + (suffix ? `<span class="suffix">${suffix}</span>` : '');
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => io.observe(c));
  }

  // ---------- Subtle hero parallax ----------
  function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const bg = hero.querySelector('.hero__bg');
    const content = hero.querySelector('.hero__content');
    if (!bg) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < window.innerHeight) {
            bg.style.transform = `translateY(${y * 0.3}px) scale(1.05)`;
            if (content) content.style.transform = `translateY(${y * 0.15}px)`;
            if (content) content.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.8)));
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- Ripple effect ----------
  function initRipple() {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.classList.add('ripple');
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
        const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
        const span = document.createElement('span');
        span.className = 'ripple-span';
        span.style.width = span.style.height = size + 'px';
        span.style.left = x + 'px';
        span.style.top = y + 'px';
        this.appendChild(span);
        setTimeout(() => span.remove(), 600);
      });
    });
  }

  // ---------- Smooth anchor scroll ----------
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (id.length <= 1) return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ---------- Lazy load images ----------
  function initLazy() {
    const imgs = document.querySelectorAll('img.lazy');
    if (!imgs.length) return;
    if (!('IntersectionObserver' in window)) {
      imgs.forEach((img) => {
        if (img.dataset.src) img.src = img.dataset.src;
        img.classList.add('loaded');
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) img.src = img.dataset.src;
            img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
            io.unobserve(img);
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    imgs.forEach((img) => io.observe(img));
  }

  function init() {
    initReveal();
    initParticles();
    // initCounters(); // Disabled: stats now display statically
    initParallax();
    initRipple();
    initSmoothScroll();
    initLazy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
