const CACHE_NAME = 'mijuai-cache-v1';

const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Ignore fail to cache issues since files might be built dynamically
    await cache.addAll(INITIAL_CACHED_RESOURCES).catch(err => console.warn('Cache addAll failed:', err));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key !== CACHE_NAME) {
        await caches.delete(key);
      }
    }
  })());
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // 只缓存同源的静态资源或页面
  if (!url.origin.includes(location.origin)) return;
  if (url.pathname.includes('/api/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    // Stale-while-revalidate strategy (or Cache-first with background update)
    if (cachedResponse) {
      fetch(event.request).then(netResponse => {
        if(netResponse && netResponse.status === 200) {
            cache.put(event.request, netResponse.clone());
        }
      }).catch(() => { /* offline silently handles */ });
      return cachedResponse;
    } else {
      try {
        const netResponse = await fetch(event.request);
        if(netResponse && netResponse.status === 200) {
            cache.put(event.request, netResponse.clone());
        }
        return netResponse;
      } catch (err) {
        if (event.request.mode === 'navigate') {
           return cache.match('/index.html');
        }
        throw err;
      }
    }
  })());
});
