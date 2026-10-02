// Minimal offline-first service worker. Network-first so updates are picked up
// immediately, with a cache fallback when the device is offline.
const CACHE = 'fr-fluency-trainer-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        const copy = response.clone()
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => undefined)
        return response
      } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const scope = self.registration.scope
          const shell = await caches.match(`${scope}index.html`)
          if (shell) return shell
        }
        throw new Error('Hors ligne et ressource non mise en cache')
      }
    })(),
  )
})
