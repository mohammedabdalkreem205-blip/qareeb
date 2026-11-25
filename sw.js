// ⚠️ مهم جداً: قم بتغيير الرقم (v1) إلى (v2) ثم (v3) في كل مرة تقوم بتحديث الموقع
const CACHE_NAME = 'qareeb-v2.0.0'; 
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './icon.png',
  './hero-bg.jpg'
];

// تثبيت التطبيق وتخزين الملفات الأساسية
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // إجبار المتصفح على تثبيت النسخة الجديدة فوراً
});

// تفعيل التطبيق وحذف الكاش القديم
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); 
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); 
    })
  );
});

// جلب البيانات (شبكة أولاً، ثم الذاكرة)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
