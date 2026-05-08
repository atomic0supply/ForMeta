const CACHE = 'formeta-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = request.url;

  // Never cache: Firebase, API routes, auth
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('/api/') ||
    url.includes('identitytoolkit')
  ) {
    e.respondWith(fetch(request));
    return;
  }

  // Network-first: try fresh, cache as fallback
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
