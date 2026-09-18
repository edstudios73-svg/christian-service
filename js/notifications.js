/* Christian Service Church notifications and unread state. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://uysfgupzlxfhplwqcttp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InV5c2ZndXB6bHhmaHBsd3FjdHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTUxNTEsImV4cCI6MjEwNTM5MTE1MX0.uAh-0SFwbLVGKA4J62f2blR_18PCUfquJZs0k9pY1Gs';
  const VAPID_PUBLIC_KEY = window.CSC_PUSH_VAPID_PUBLIC_KEY || '';
  const CURRENT_SUPABASE_PUBLIC_KEY = 'sb_publishable_5T68Teyy88wmJUlckVRneA_Yfh0OKZV';
  const LOCAL_READS = 'csc:announcement-reads';
  const REST_HEADERS = { apikey: CURRENT_SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${CURRENT_SUPABASE_PUBLIC_KEY}` };
  let sb;
  let userId;
  let originalFavicon;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_READS) || '[]'); } catch (_) { return []; }
  }

  function writeLocal(ids) {
    try { localStorage.setItem(LOCAL_READS, JSON.stringify([...new Set(ids)])); } catch (_) {}
  }

  function updateFavicon(count) {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    if (!originalFavicon) originalFavicon = link.href;
    if (!count) { link.href = originalFavicon; return; }
    const image = new Image();
    image.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, size, size);
      context.fillStyle = '#d94b4b';
      context.beginPath(); context.arc(49, 15, 15, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#fff'; context.font = 'bold 18px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(count > 9 ? '9+' : String(count), 49, 15);
      link.href = canvas.toDataURL('image/png');
    };
    image.src = originalFavicon;
  }

  function paintCount(count) {
    const value = Number(count || 0);
    document.querySelectorAll('.nav__announcement-count').forEach((badge) => {
      badge.textContent = value > 99 ? '99+' : String(value);
      badge.hidden = value < 1;
      badge.parentElement?.setAttribute('aria-label', value ? `Announcements (${value})` : 'Announcements');
    });
    updateFavicon(value);
    const badgePromise = value > 0 && typeof navigator.setAppBadge === 'function'
      ? navigator.setAppBadge(value)
      : value === 0 && typeof navigator.clearAppBadge === 'function' ? navigator.clearAppBadge() : null;
    if (badgePromise?.catch) badgePromise.catch(() => {});
    window.CSC_ANNOUNCEMENT_COUNT = value;
    return value;
  }

  async function ensureSupabase() {
    if (sb) return sb;
    if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    sb = window.supabase.createClient(SUPABASE_URL, CURRENT_SUPABASE_PUBLIC_KEY);
    window.CSC_SUPABASE = window.CSC_SUPABASE || sb;
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const result = await sb.auth.signInAnonymously();
      if (result.error) throw result.error;
      data = result.data;
    }
    userId = data.session?.user?.id;
    return sb;
  }

  async function unreadCount() {
    try {
      const client = await ensureSupabase();
      const [{ data: announcements, error: announcementsError }, { data: reads, error: readsError }] = await Promise.all([
        client.from('announcements').select('id').eq('published', true),
        client.from('announcement_reads').select('announcement_id')
      ]);
      if (announcementsError) throw announcementsError;
      if (readsError) throw readsError;
      const readIds = new Set([...readLocal(), ...(reads || []).map((row) => String(row.announcement_id))]);
      return paintCount((announcements || []).filter((row) => !readIds.has(String(row.id))).length);
    } catch (_) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=id&published=eq.true`, { headers: REST_HEADERS });
      if (!response.ok) throw new Error('Could not load announcements');
      const announcements = await response.json();
      const readIds = new Set(readLocal());
      return paintCount(announcements.filter((row) => !readIds.has(String(row.id))).length);
    }
  }

  async function markRead(id) {
    if (!id) return;
    const local = readLocal();
    if (!local.includes(String(id))) { local.push(String(id)); writeLocal(local); }
    try {
      const client = await ensureSupabase();
      await client.from('announcement_reads').upsert({ user_id: userId, announcement_id: String(id) }, { onConflict: 'user_id,announcement_id' });
      await unreadCount();
    } catch (_) { paintCount(Math.max(0, Number(window.CSC_ANNOUNCEMENT_COUNT || 0) - 1)); }
  }

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      throw new Error('Push notifications are not configured for this site yet.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    const json = subscription.toJSON();
    const client = await ensureSupabase();
    const { error } = await client.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      active: true,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    return true;
  }

  function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
  }

  function showPermissionPrompt() {
    let dialog = document.querySelector('[data-notification-dialog]');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'notification-dialog';
      dialog.dataset.notificationDialog = '';
      dialog.innerHTML = `
        <div class="notification-dialog__content">
          <button class="notification-dialog__close" type="button" data-notification-close aria-label="Close">&times;</button>
          <span class="notification-dialog__icon" aria-hidden="true">!</span>
          <h2>Stay up to date</h2>
          <p>Get important church announcements and updates, even when you are not on the website.</p>
          <p class="notification-dialog__status" data-notification-status role="status"></p>
          <div class="notification-dialog__actions">
            <button class="btn btn-outline" type="button" data-notification-close>Not now</button>
            <button class="btn btn-primary" type="button" data-enable-notifications>Enable announcements</button>
          </div>
        </div>`;
      document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-notification-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
      dialog.querySelector('[data-enable-notifications]').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        const status = dialog.querySelector('[data-notification-status]');
        button.disabled = true;
        status.textContent = 'Connecting notifications…';
        try {
          const enabled = await subscribe();
          status.textContent = enabled ? 'Announcements are enabled on this device.' : 'Notifications were not enabled.';
          if (enabled) setTimeout(() => dialog.close(), 900);
        } catch (error) {
          status.textContent = /invalid.*(api|key)|applicationserverkey/i.test(error.message || '')
            ? 'Notifications are not fully configured yet. Please try again later.'
            : (error.message || 'Notifications could not be enabled on this device.');
          button.disabled = false;
        }
      });
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function bindPermissionPrompt() {
    const link = document.querySelector('.nav__announcement');
    if (!link || link.dataset.notificationPromptBound) return;
    link.dataset.notificationPromptBound = 'true';
    if (!('Notification' in window) || Notification.permission !== 'default' || !VAPID_PUBLIC_KEY) return;
    link.addEventListener('click', (event) => {
      if (Notification.permission === 'granted') return;
      event.preventDefault();
      showPermissionPrompt();
    });
  }

  function bindAnnouncementCards() {
    document.querySelectorAll('[data-announcement-id]').forEach((card) => {
      if (card.dataset.readBound) return;
      card.dataset.readBound = 'true';
      const id = card.dataset.announcementId;
      card.addEventListener('click', () => markRead(id));
      if (decodeURIComponent(window.location.hash.slice(1)) === id) markRead(id);
    });
  }

  async function init() {
    bindPermissionPrompt();
    bindAnnouncementCards();
    try { await unreadCount(); } catch (_) { paintCount(0); }
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'announcement-received') unreadCount().catch(() => {});
    });
    window.addEventListener('pageshow', () => unreadCount().catch(() => {}));
    window.addEventListener('focus', () => unreadCount().catch(() => {}));
    window.CSC_NOTIFICATIONS = { updateUnreadAnnouncementBadge: unreadCount, clearAnnouncementBadge: () => paintCount(0), markAnnouncementRead: markRead, subscribe };
    new MutationObserver(bindAnnouncementCards).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
