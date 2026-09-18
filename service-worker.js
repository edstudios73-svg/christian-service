const CACHE_NAME = 'csc-app-shell-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}
  const title = payload.title || 'New Announcement';
  const body = payload.body || 'Christian Service Church has shared a new announcement.';
  const url = new URL(payload.url || '/announcements.html', self.location.origin).href;
  event.waitUntil((async () => {
    await self.registration.showNotification('Christian Service Church', {
      body: `${title}\n${body}`,
      icon: '/assets/church-logo.png',
      badge: '/assets/church-logo.png',
      tag: `announcement-${payload.announcementId || Date.now()}`,
      data: { url, announcementId: payload.announcementId }
    });
    if (typeof self.registration.setAppBadge === 'function' && Number.isFinite(payload.badgeCount)) {
      try { await self.registration.setAppBadge(payload.badgeCount); } catch (_) {}
    }
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'announcement-received', announcementId: payload.announcementId }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = event.notification.data?.url || new URL('/announcements.html', self.location.origin).href;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});
