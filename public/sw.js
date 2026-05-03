// Vitality Prayer - Service Worker
const CACHE_NAME = 'vitality-prayer-v1'
const STATIC_ASSETS = [
  '/',
  '/_nuxt/',
]

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch: Network first, cache fallback for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Return from cache if network fails
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Return offline fallback for navigation
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
          throw new Error('Network error and no cache')
        })
      })
  )
})
