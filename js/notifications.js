/* Christian Service Church notifications and unread state. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://uysfgupzlxfhplwqcttp.supabase.co';
  const SUPABASE_PUBLIC_KEY = 'sb_publishable_5T68Teyy88wmJUlckVRneA_Yfh0OKZV';
  const VAPID_PUBLIC_KEY = window.CSC_PUSH_VAPID_PUBLIC_KEY || '';
  const LAST_READ_KEY = 'csc:announcement-last-read';
  const DISMISS_KEY = 'csc:notification-prompt-dismissed';
  const BADGE_SCOPE = 'csc-announcement-badge';

  const state = { sb: null, pollTimer: null, lastCount: 0, broadcast: null };

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  function getLastReadValue() {
    try { return localStorage.getItem(LAST_READ_KEY) || '1970-01-01T00:00:00.000Z'; }
    catch (_) { return '1970-01-01T00:00:00.000Z'; }
  }

  function setLastReadValue(value) {
    try { localStorage.setItem(LAST_READ_KEY, value); } catch (_) {}
    if (state.broadcast) state.broadcast.postMessage({ type: 'csc-last-read', value });
  }

  function setBadge(count, animate = false) {
    const value = Math.max(0, Number(count) || 0);
    state.lastCount = value;

    document.querySelectorAll('.nav__announcement-count, .csc-dh__badge').forEach((badge) => {
      const display = value > 9 ? '9+' : String(value);
      badge.textContent = display;
      badge.hidden = value === 0;
      badge.parentElement?.setAttribute('aria-label', value > 0 ? `Announcements, ${value} unread` : 'Announcements');
      badge.parentElement?.setAttribute('title', value > 0 ? `Announcements, ${value} unread` : 'Announcements');
      badge.classList.toggle('is-popping', !!animate && value > 0);
      if (animate) setTimeout(() => badge.classList.remove('is-popping'), 240);
    });

    if (typeof navigator.setAppBadge === 'function') {
      const result = value > 0 ? navigator.setAppBadge(value) : navigator.clearAppBadge?.();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    }
    if (value === 0 && typeof navigator.clearAppBadge === 'function') navigator.clearAppBadge().catch(() => {});
    window.CSC_ANNOUNCEMENT_COUNT = value;
  }

  async function ensureSupabase() {
    if (!state.sb) {
      if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      state.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
      window.CSC_SUPABASE = state.sb;
    }
    return state.sb;
  }

  function getNewestAnnouncementDate(items) {
    let newest = null;
    for (const item of items || []) {
      const candidate = item?.created_at || item?.date || item?.updated_at || '';
      if (!candidate) continue;
      const time = new Date(candidate).getTime();
      if (Number.isFinite(time) && (!newest || time > newest)) newest = time;
    }
    return newest ? new Date(newest).toISOString() : null;
  }

  async function refreshUnreadBadge() {
    const lastRead = getLastReadValue();
    try {
      const client = await ensureSupabase();
      const { count, error } = await client
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('published', true)
        .gt('created_at', lastRead);
      if (error) throw error;
      setBadge(Number(count || 0), true);
      return Number(count || 0);
    } catch (_) {
      setBadge(0, false);
      return 0;
    }
  }

  function updatePolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (document.visibilityState === 'visible') {
      state.pollTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') refreshUnreadBadge().catch(() => {});
      }, 60000);
    }
  }

  function showNotificationSheet() {
    if (document.querySelector('[data-csc-notify-sheet]')) return;
    const sheet = document.createElement('div');
    sheet.setAttribute('data-csc-notify-sheet', 'true');
    sheet.className = 'csc-notification-sheet';
    sheet.innerHTML = `
      <div class="csc-notification-sheet__panel">
        <div class="csc-notification-sheet__header">
          <div class="csc-notification-sheet__icon" aria-hidden="true">!</div>
          <div>
            <strong>Never miss an announcement</strong>
            <p>Get church announcements on your phone.</p>
          </div>
        </div>
        <div class="csc-notification-sheet__actions">
          <button type="button" class="btn btn-primary" data-csc-enable-notifications>Enable Notifications</button>
          <button type="button" class="btn btn-outline" data-csc-dismiss-notifications>Not now</button>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);

    const close = () => sheet.remove();
    sheet.querySelector('[data-csc-dismiss-notifications]').addEventListener('click', () => {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
      close();
    });
    sheet.querySelector('[data-csc-enable-notifications]').addEventListener('click', async () => {
      close();
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
        window.location.href = 'announcements.html';
        return;
      }
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          const existing = await registration.pushManager.getSubscription();
          const subscription = existing || await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          const json = subscription.toJSON();
          const client = await ensureSupabase();
          await client.from('push_subscriptions').upsert({
            endpoint: subscription.endpoint,
            p256dh: json.keys?.p256dh || '',
            auth: json.keys?.auth || '',
            user_agent: navigator.userAgent,
            active: true,
            last_seen: new Date().toISOString()
          }, { onConflict: 'endpoint' });
          const toast = document.createElement('div');
          toast.className = 'csc-toast';
          toast.textContent = 'Notifications enabled';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2200);
        } catch (_) {
          const toast = document.createElement('div');
          toast.className = 'csc-toast csc-toast--error';
          toast.textContent = 'Notifications could not be enabled right now.';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2600);
        }
      }
      window.location.href = 'announcements.html';
    });
  }

  function shouldPromptForNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) return false;
    if (Notification.permission !== 'default') return false;
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  }

  function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
  }

  function markAnnouncementsRead(items) {
    const newest = getNewestAnnouncementDate(items);
    if (!newest) return;
    setLastReadValue(newest);
    setBadge(0, false);
    window.dispatchEvent(new CustomEvent('csc-announcements-read', { detail: { newest } }));
  }

  document.addEventListener('csc-announcements-rendered', (event) => {
    const list = Array.isArray(event.detail?.items) ? event.detail.items : [];
    if (window.location.pathname.toLowerCase().endsWith('announcements.html')) {
      markAnnouncementsRead(list);
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('.nav__announcement-link, .csc-dh__bell');
    if (!target) return;
    if (Notification.permission === 'default' && shouldPromptForNotifications()) {
      event.preventDefault();
      showNotificationSheet();
    }
  }, true);

  if (typeof BroadcastChannel !== 'undefined') {
    state.broadcast = new BroadcastChannel(BADGE_SCOPE);
    state.broadcast.addEventListener('message', (event) => {
      if (event.data?.type === 'csc-last-read') refreshUnreadBadge().catch(() => {});
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === LAST_READ_KEY) refreshUnreadBadge().catch(() => {});
  });

  document.addEventListener('visibilitychange', () => {
    updatePolling();
    if (!document.hidden) refreshUnreadBadge().catch(() => {});
  });

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'announcement-received') refreshUnreadBadge().catch(() => {});
    });
  }

  window.CSC_NOTIFICATIONS = {
    updateUnreadAnnouncementBadge: () => refreshUnreadBadge().catch(() => {}),
    clearAnnouncementBadge: () => setBadge(0, false),
    markAnnouncementRead: markAnnouncementsRead,
    subscribe: async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
        throw new Error('Push notifications are not supported on this browser.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      const json = subscription.toJSON();
      const client = await ensureSupabase();
      await client.from('push_subscriptions').upsert({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh || '',
        auth: json.keys?.auth || '',
        user_agent: navigator.userAgent,
        active: true,
        last_seen: new Date().toISOString()
      }, { onConflict: 'endpoint' });
      return true;
    }
  };

  function init() {
    setBadge(0, false);
    refreshUnreadBadge().catch(() => {});
    updatePolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
