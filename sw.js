/**
 * Service worker — giữ ảnh/mã trong cache của trình duyệt để lần mở sau
 * không phải tải lại (GitHub Pages không cho tự đặt header cache).
 *
 *   ảnh, font      cache-first: có trong cache thì dùng luôn
 *   html/js/css/…  stale-while-revalidate: dùng bản cache ngay, ngầm tải bản mới
 *                  để lần mở sau thấy thay đổi
 *
 * ĐỔI `VERSION` mỗi khi thay ảnh giữ nguyên tên file, không thì người đã vào
 * trang vẫn thấy ảnh cũ. Đổi VERSION thì cache cũ bị xoá khi worker mới lên.
 */
const VERSION = 'v1';
const CACHE = 'kongtien-luyna-' + VERSION;

// Tải sẵn lúc cài, để chuyến tàu chạy được ngay cả khi mạng chập chờn
const PRECACHE = [
    './',
    'index.html',
    'assets/css/main.css',
    'assets/images/scenes/welcome-bg.webp',
    'assets/images/scenes/De-sterrennacht-1.webp',
    'assets/images/scenes/De-sterrennacht-2.webp',
    'assets/images/frames/modal-1-btn.webp',
    'assets/images/frames/modal-2-btn.webp',
    'assets/images/locomotive.webp',
    'assets/images/train-carriage.webp',
    'assets/images/train-wheels/1.webp',
    'assets/images/train-wheels/2.webp',
    'assets/images/train-wheels/3.webp',
    'assets/images/train-wheels/4.webp',
    'assets/images/train-wheels/5.webp',
    'assets/images/smoke/3.webp',
    'assets/images/smoke/4.webp',
    'assets/images/smoke/6.webp',
    'assets/images/letter/paper.webp',
    'assets/images/letter/paper-shadow.webp',
    'assets/images/letter/pen.webp',
    'assets/days/2026-18-10/day.js',
    'assets/days/2026-18-10/photos/station.webp'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            // Một file lỗi không được làm hỏng cả lượt cài
            .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k.startsWith('kongtien-luyna-') && k !== CACHE)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    // Âm thanh/video xin từng khúc (Range) — để trình duyệt tự lo, cache nguyên file dễ hỏng tua
    if (req.headers.has('range')) return;

    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const isFont = url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com';
    if (!sameOrigin && !isFont) return;

    const isImage = /\.(webp|png|jpe?g|gif|svg|ico)$/i.test(url.pathname);
    event.respondWith(isImage || url.hostname === 'fonts.gstatic.com'
        ? cacheFirst(req)
        : staleWhileRevalidate(req));
});

function cacheFirst(req) {
    return caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
        }))
    );
}

function staleWhileRevalidate(req) {
    return caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => {
            const fresh = fetch(req).then((res) => {
                if (res.ok) cache.put(req, res.clone());
                return res;
            }).catch(() => hit);
            return hit || fresh;
        })
    );
}
