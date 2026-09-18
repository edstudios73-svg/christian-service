(function () {
  'use strict';

  const placeholderId = 'G-XXXXXXXXXX';
  const measurementId = window.CSC_GA_MEASUREMENT_ID || '';

  function isConfigured(id) {
    return !!id && id !== placeholderId && /^G-[A-Z0-9]+$/i.test(id);
  }

  function gtag() {
    if (!window.dataLayer) window.dataLayer = [];
    window.dataLayer.push(arguments);
  }

  if (!isConfigured(measurementId)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || gtag;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: true });

  window.CSC_GA_TRACK = function (eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.CSC_GA_TRACK) {
      window.CSC_GA_TRACK('page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search
      });
    }
  });

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-ga-event]');
    if (!trigger) return;
    const name = trigger.getAttribute('data-ga-event') || 'cta_click';
    const label = trigger.getAttribute('data-ga-label') || (trigger.textContent || '').trim().slice(0, 80);
    window.CSC_GA_TRACK(name, { event_label: label, page_path: window.location.pathname });
  });

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const eventName = form.getAttribute('data-ga-event') || 'form_submit';
    window.CSC_GA_TRACK(eventName, {
      form_id: form.id || form.getAttribute('name') || 'unknown_form',
      page_path: window.location.pathname
    });
  });
})();
