const CACHE_NAME = 'csc-app-shell-v11';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

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

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const registration = event.target;
    if (!registration) return;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey || undefined
    });
    if (subscription) return subscription;
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const url = new URL(request.url);
  const isNavigate = request.mode === 'navigate' || /\.(html|htm)$/i.test(url.pathname) || url.pathname.endsWith('/');
  const isAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?|pdf|mp4)$/i.test(url.pathname);

  if (!isNavigate && !isAsset) return;

  event.respondWith((async () => {
    try {
      const network = await fetch(request, { cache: 'no-store', credentials: 'same-origin' });
      if (network && network.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, network.clone());
      }
      return network;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
