// Offline app shell. Video list: network first (fresh), fall back to cache. Thumbnails: cache as seen.
const SHELL = 'babytube-shell-v1'
const IMG = 'babytube-img-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './catalog.json', './manifest.webmanifest'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== IMG).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.hostname === 'i.ytimg.com' || url.hostname.endsWith('googleusercontent.com')) {
    e.respondWith(
      caches.open(IMG).then(async (c) => {
        const hit = await c.match(e.request)
        if (hit) return hit
        const res = await fetch(e.request)
        if (res.ok || res.type === 'opaque') c.put(e.request, res.clone())
        return res
      }),
    )
    return
  }
  if (url.origin !== location.origin) return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(e.request, res.clone()))
        return res
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  )
})
