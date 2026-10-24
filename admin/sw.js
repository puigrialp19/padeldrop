// Service worker del panel: hace que el panel se pueda instalar como app en el móvil.
// IMPORTANTE: no guarda en caché ningún dato de clientes ni pedidos. Todo se pide siempre al servidor;
// solo se guarda una pantalla de "sin conexión" para cuando no hay internet.
const CACHE = 'pd-admin-offline-v2';
const OFFLINE_URL = '/admin/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: 'reload' }))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Solo intercepta la navegación entre pantallas: si no hay red, muestra el aviso de "sin conexión".
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // API, CSS, JS e imágenes: van directos al servidor
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

// ---- Avisos de pedidos nuevos (notificaciones push) ----
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }
  const title = data.title || 'PADEL DROP';
  const url = data.url || '/admin/#/pedidos';
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: data.body || 'Tienes novedades en el panel.',
      icon: '/admin/icons/icon-192.png',
      badge: '/admin/icons/badge-96.png',
      tag: data.tag || 'pd',
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url },
    });
    // Si la app está abierta, que se actualice sola
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach((w) => w.postMessage({ type: 'pd-push', url, title }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin/#/pedidos', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => new URL(w.url).pathname.startsWith('/admin'));
    if (win) { await win.focus(); return win.navigate ? win.navigate(url) : win.postMessage({ type: 'pd-open', url }); }
    return self.clients.openWindow(url);
  })());
});
