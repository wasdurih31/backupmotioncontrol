// Dummy service worker to resolve 404 errors if any library expects sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service Worker activated.');
});
