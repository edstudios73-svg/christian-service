const CACHE_NAME = 'csc-app-shell-v15';

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
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-48.png',
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
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/csc-admin/')) return;        // the admin always goes to the network
  if (/\.(pdf|mp4|mp3|zip)$/i.test(url.pathname)) return;     // large downloads are not cached here

  const isPage = request.mode === 'navigate' || /\.html?$/i.test(url.pathname) || url.pathname.endsWith('/');
  const isAsset = /\.(css|js|png|jpe?g|gif|svg|ico|webp|avif|woff2?|json)$/i.test(url.pathname);
  if (!isPage && !isAsset) return;

  // Pages: always try the network first so visitors see fresh content, but never wait more than 2.5s if we have a saved copy.
  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: false });
      const network = fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      });
      if (!cached) return network.catch(() => caches.match('/404.html'));
      event.waitUntil(network.catch(() => {}));
      return Promise.race([network.catch(() => cached), new Promise((resolve) => setTimeout(() => resolve(cached), 2500))]);
    })());
    return;
  }

  // Styles, scripts, images, fonts: answer instantly from the saved copy and refresh it quietly in the background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const refresh = fetch(request, { cache: 'no-cache' }).then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    });
    if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
    return refresh;
  })());
});
