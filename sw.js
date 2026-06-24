/**
 * PWA 업데이트 — index.html·version.json은 항상 네트워크 우선
 * (Android 홈화면·iOS Safari 홈화면 캐시로 구버전 고정되는 문제 완화)
 */
const SHELL = 'tuduk-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isFreshDocumentRequest(request, url) {
  if (request.mode === 'navigate') return true;
  const path = url.pathname;
  return path.endsWith('/index.html')
    || path.endsWith('/')
    || path.endsWith('/version.json');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isFreshDocumentRequest(request, url)) {
    event.respondWith((async () => {
      try {
        return await fetch(request, { cache: 'no-store' });
      } catch {
        const cache = await caches.open(SHELL);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error('offline');
      }
    })());
  }
});
