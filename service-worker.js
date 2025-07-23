const CACHE_NAME = 'training-tracker-cache-v1';
const urlsToCache = [
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5.woff2', // Inter font WOFF2
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

// Install event: caches all necessary assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching assets');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Caching failed', error);
            })
    );
});

// Activate event: cleans up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: serves cached content or fetches from network
self.addEventListener('fetch', (event) => {
    // For Firebase API calls, always try network first, then fallback to cache (if applicable)
    // Firestore uses WebSockets and complex HTTP requests, so direct caching of its data
    // through a service worker is not typically done for real-time updates.
    // The Firebase SDK handles its own offline persistence.
    if (event.request.url.includes('googleapis.com') || event.request.url.includes('firebaseio.com')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If network fails for Firebase, the SDK will handle offline data
                // This catch is primarily for other API calls if they were added
                console.log('Service Worker: Network request failed for API, letting Firebase SDK handle');
                return new Response(null, { status: 503, statusText: 'Service Unavailable' }); // Or a more appropriate fallback
            })
        );
        return;
    }

    // For other assets, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                // Otherwise, fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache new requests if they are valid
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback for offline if network fails and not in cache
                        console.log('Service Worker: Fetch failed for:', event.request.url);
                        // You could return an offline page here if you had one
                        // For now, it will just fail to load if not cached.
                        return new Response('<h1>Offline</h1><p>You are offline and this content is not cached.</p>', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
            })
    );
});