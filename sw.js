// 서비스 워커: 인터넷이 되면 항상 새 파일을 먼저 받고, 안 되면 저장해 둔 파일로 연다.
// 파일을 고칠 때마다 아래 버전 숫자를 올린다.
const CACHE = 'my-app-cache-v29';
const FILES = [
  './', './index.html', './style.css', './app.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('my-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }   // 정상 응답만 저장
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

// 알림을 누르면 앱을 열거나 이미 열려 있는 앱으로 이동한다
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
