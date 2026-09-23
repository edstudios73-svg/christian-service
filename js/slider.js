/* ==========================================================================
   Slider — testimonial carousel (swipe + autoplay) & gallery lightbox
   ========================================================================== */
(function () {
  'use strict';

  // ---------- Testimonial Carousel ----------
  function initTestimonials() {
    const carousel = document.querySelector('[data-carousel]');
    if (!carousel) return;

    const track = carousel.querySelector('.testimonial-track');
    const slides = carousel.querySelectorAll('.testimonial-slide');
    const dotsWrap = carousel.parentElement.querySelector('.testimonial-dots');
    if (!track || !slides.length) return;

    let index = 0;
    let autoplayId = null;
    const AUTOPLAY_MS = 6000;

    // Build dots
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'testimonial-dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
        dot.addEventListener('click', () => goTo(i, true));
        dotsWrap.appendChild(dot);
      });
    }

    function goTo(i, fromUser) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      if (dotsWrap) {
        dotsWrap.querySelectorAll('.testimonial-dot').forEach((d, di) => {
          d.classList.toggle('is-active', di === index);
        });
      }
      if (fromUser) restartAutoplay();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    function startAutoplay() { /* Manual controls remain available; autoplay is disabled. */ }
    function stopAutoplay() { if (autoplayId) clearInterval(autoplayId); }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    // Touch / swipe
    let startX = 0, currentX = 0, dragging = false;
    carousel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      dragging = true;
      stopAutoplay();
      track.style.transition = 'none';
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      const w = carousel.offsetWidth;
      track.style.transform = `translateX(calc(-${index * 100}% + ${diff}px))`;
    }, { passive: true });

    carousel.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      const diff = currentX - startX;
      const threshold = carousel.offsetWidth * 0.18;
      if (diff < -threshold) goTo(index + 1, true);
      else if (diff > threshold) goTo(index - 1, true);
      else goTo(index, true);
      startAutoplay();
    });

    // Pause on hover (desktop)
    if (slides.length > 1) {
      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
      startAutoplay();
    } else if (dotsWrap) {
      dotsWrap.style.display = 'none';
    }
  }

  // ---------- Gallery Lightbox ----------
  function initLightbox() {
    const items = document.querySelectorAll('[data-lightbox]');
    if (!items.length) return;

    let lb = document.querySelector('.lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = `
        <button class="lightbox__close" aria-label="Close">×</button>
        <img class="lightbox__img" alt="">
        <div class="lightbox__caption"></div>
      `;
      document.body.appendChild(lb);
    }
    const img = lb.querySelector('.lightbox__img');
    const caption = lb.querySelector('.lightbox__caption');
    const close = lb.querySelector('.lightbox__close');

    let current = 0;
    const urls = Array.from(items).map((it) => ({
      src: it.getAttribute('data-lightbox'),
      cap: it.getAttribute('data-caption') || '',
    }));

    function open(i) {
      current = i;
      show();
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function show() {
      img.src = urls[current].src;
      caption.textContent = urls[current].cap;
    }
    function closeLb() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    function nextImg() { current = (current + 1) % urls.length; show(); }
    function prevImg() { current = (current - 1 + urls.length) % urls.length; show(); }

    items.forEach((it, i) => {
      it.addEventListener('click', (e) => { e.preventDefault(); open(i); });
    });

    close.addEventListener('click', closeLb);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') nextImg();
      if (e.key === 'ArrowLeft') prevImg();
    });

    // Swipe in lightbox
    let sx = 0;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) dx < 0 ? nextImg() : prevImg();
    });
  }

  function init() {
    initTestimonials();
    initLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
