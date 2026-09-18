/* ==========================================================================
   App — shared footer, forms (prayer, contact, newsletter), countdown,
   giving amount selector, chip selectors, accordions.
   ========================================================================== */
(function () {
  'use strict';

  // ---------- Shared Footer (full church details on every page) ----------
  function buildFooter() {
    const mount = document.querySelector('[data-footer-mount]');
    if (!mount) return;
    const year = new Date().getFullYear();
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
      <div class="container">
        <div class="footer__brand">
          <img src="assets/church-logo.png" alt="Christian Service Church logo" loading="lazy">
          <div class="footer__brand-text">
            Christian Service Church
            <small>House of Testimonies</small>
          </div>
        </div>

        <p class="footer__about">
          Christian Service Church is a Bible-believing church at Jungle Avenue Road, East Legon, Accra.
          We meet every Sunday at 9:00 AM. The church was started by the late Rev. Captain (Rtd) James C. Ocran
          and is led today by his son, Rev. Dr. Joseph Payin Ezekiel.
        </p>

        <div class="footer__block">
          <h4 class="footer__col-title">Visit Us</h4>
          <ul class="footer__list">
            <li>Jungle Avenue Road, East Legon<br>Accra, Greater Accra, Ghana</li>
            <li>GPS / Plus Code: JVP2+Q28 Accra</li>
            <li><a href="tel:+233551172156">0551172156</a></li>
            <li><a href="mailto:info@christianservicechurch.org">info@christianservicechurch.org</a></li>
            <li><a href="https://maps.app.goo.gl/z1w5Gh8bt6yHNZiZA" target="_blank" rel="noopener">Open in Google Maps</a></li>
          </ul>
        </div>

        <div class="footer__block">
          <h4 class="footer__col-title">Service Times</h4>
          <div class="footer__times">
            <div><span>Sunday &mdash; Worship</span><span>9:00 AM &ndash; 12 noon</span></div>
            <div><span>Monday &mdash; Prayer Meeting</span><span>6:30 &ndash; 7:30 PM</span></div>
            <div><span>Tuesday &mdash; Women of Destiny</span><span>9:00 AM &ndash; 12 noon</span></div>
            <div><span>Tuesday &mdash; Youth Fellowship</span><span>6:30 &ndash; 7:30 PM</span></div>
            <div><span>Wednesday &mdash; Bible Studies</span><span>6:30 &ndash; 7:30 PM</span></div>
            <div><span>Thursday &mdash; Women Fellowship</span><span>6:30 &ndash; 7:30 PM</span></div>
            <div><span>Saturday &mdash; Shiloh Hour</span><span>9:00 &ndash; 11:00 AM</span></div>
          </div>
        </div>

        <div class="footer__block">
          <h4 class="footer__col-title">Quick Links</h4>
          <ul class="footer__list footer__links-grid">
            <li><a href="index.html">Home</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="pastor.html">Our Pastor</a></li>
            <li><a href="ministries.html">Ministries</a></li>
            <li><a href="sermons.html">Sermons</a></li>
            <li><a href="events.html">Events</a></li>
            <li><a href="gallery.html">Gallery</a></li>
            <li><a href="testimonies.html">Testimonies</a></li>
            <li><a href="prayer.html">Prayer Request</a></li>
            <li><a href="giving.html">Giving</a></li>
            <li><a href="members.html">Our Leaders</a></li>
            <li><a href="contact.html">Contact</a></li>
            <li><a href="csc-admin/admin.html">Admin</a></li>
          </ul>
        </div>

        <div class="footer__top footer__top--single">
          <h4 class="footer__col-title">Follow Us</h4>
          <div class="footer__social footer__social--center">
            <a href="https://www.facebook.com/christianservicechurch" class="social-icon social-icon--facebook" aria-label="Christian Service Church on Facebook" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
            <a href="https://www.instagram.com/christianservicechurch11" class="social-icon social-icon--instagram" aria-label="Christian Service Church on Instagram" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
            <a href="https://www.tiktok.com/@christianservicechurch" class="social-icon social-icon--tiktok" aria-label="Christian Service Church on TikTok" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 3c.3 1.7 1.3 2.8 3 3.1v3.1c-1.1 0-2.1-.3-3-.8v6.2a6.4 6.4 0 1 1-5.5-6.3v3.3a3.1 3.1 0 1 0 2.4 3V3h3.1z"/></svg></a>
            <a href="https://wa.me/233551172156" class="social-icon social-icon--whatsapp" aria-label="Chat with Christian Service Church on WhatsApp" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.2-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"/></svg></a>
          </div>
        </div>

        <div class="footer__bottom">
          <p>&copy; ${year} Christian Service Church, East Legon, Accra. All rights reserved.</p>
        </div>
      </div>
    `;
    mount.appendChild(footer);
  }

  // ---------- FAQ toggles ----------
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const q = item.querySelector('.faq-item__q');
      const a = item.querySelector('.faq-item__a');
      if (!q || !a) return;
      q.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
        q.setAttribute('aria-expanded', String(open));
      });
    });
  }

  // ---------- Countdown ----------
  function initCountdown() {
    const el = document.querySelector('[data-countdown]');
    if (!el) return;
    const target = new Date(el.getAttribute('data-countdown')).getTime();

    const d = el.querySelector('[data-d]');
    const h = el.querySelector('[data-h]');
    const m = el.querySelector('[data-m]');
    const s = el.querySelector('[data-s]');

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function tick() {
      const now = Date.now();
      let diff = target - now;
      if (diff < 0) diff = 0;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (d) d.textContent = pad(days);
      if (h) h.textContent = pad(hours);
      if (m) m.textContent = pad(mins);
      if (s) s.textContent = pad(secs);
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Chip selectors (single or multi) ----------
  function initChips() {
    document.querySelectorAll('[data-chip-group]').forEach((group) => {
      const multi = group.hasAttribute('data-multi');
      group.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          if (multi) {
            chip.classList.toggle('is-selected');
          } else {
            group.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-selected'));
            chip.classList.add('is-selected');
          }
        });
      });
    });
  }

  // ---------- Giving amount selector ----------
  function initAmounts() {
    const group = document.querySelector('[data-amount-group]');
    if (!group) return;
    const custom = document.querySelector('[data-amount-custom]');
    group.querySelectorAll('.amount-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.amount-btn').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        if (custom) custom.value = '';
      });
    });
    if (custom) {
      custom.addEventListener('input', () => {
        group.querySelectorAll('.amount-btn').forEach((b) => b.classList.remove('is-selected'));
      });
    }
  }

  // ---------- Forms (prayer, contact, newsletter) ----------
  function initForms() {
    // Generic success handler
    document.querySelectorAll('form[data-form]').forEach((form) => {
      if (form.matches('[data-prayer-form]')) return;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const success = form.querySelector('.form-success');
        const card = form.querySelector('.form-card__inner');
        if (success && card) {
          card.style.display = 'none';
          success.classList.add('is-shown');
        }
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // Newsletter
    document.querySelectorAll('form[data-newsletter]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const btn = form.querySelector('button');
        if (input && input.value) {
          btn.textContent = 'Joined!';
          btn.style.background = 'linear-gradient(135deg,#2E8B57,#3CB371)';
          input.value = '';
          input.placeholder = 'Thank you for subscribing!';
          setTimeout(() => {
            btn.textContent = 'Join';
            btn.style.background = '';
            input.placeholder = 'Your email';
          }, 3500);
        }
      });
    });
  }

  // ---------- Accordion (ministry learn more, FAQ) ----------
  function initAccordion() {
    document.querySelectorAll('[data-accordion]').forEach((acc) => {
      const trigger = acc.querySelector('[data-accordion-trigger]');
      const panel = acc.querySelector('[data-accordion-panel]');
      if (!trigger || !panel) return;
      trigger.addEventListener('click', () => {
        const open = acc.classList.toggle('is-open');
        panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0';
        trigger.setAttribute('aria-expanded', String(open));
      });
    });
  }

  function init() {
    buildFooter();
    initFaq();
    initCountdown();
    initChips();
    initAmounts();
    initForms();
    initAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
