// public/sw.js の install イベント部分に追記
const assetsToCache = [
  '/',
  '/manifest.json',
  '/icon.png',
  // ここにビルドされた主要なファイルリストが入ります
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      let downloadedCount = 0;
      return Promise.all(
        assetsToCache.map((url) => {
          return cache.add(url).then(() => {
            downloadedCount++;
            // 🌟 画面側に進捗を送る
            const progress = Math.round((downloadedCount / assetsToCache.length) * 100);
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'PWA_PROGRESS', progress }));
            });
          });
        })
      );
    })
  );
});