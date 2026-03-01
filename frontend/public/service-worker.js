const CACHE_NAME = 'mohito-mart-v2';
const isLocalDevHost = ['localhost', '127.0.0.1'].includes(self.location.hostname);

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (isLocalDevHost) {
        return;
    }

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone)).catch(() => {});
                return response;
            })
            .catch(() => caches.match(request)),
    );
});
