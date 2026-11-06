// 서비스 워커: 앱 파일을 기기에 저장해서 인터넷 없이도 열리게 하고, 새 버전을 감지한다.
// ★ 파일을 고쳐서 배포할 때마다 VERSION을 올린다 (js/config.js의 VERSION과 같게).
// ★ 새 파일을 만들면 아래 FILES 목록에 추가한다.
const VERSION = '0.3.1';
const CACHE = 'haru-' + VERSION;

const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './js/app.js',
  './js/config.js',
  './js/state.js',
  './js/router.js',
  './js/pwa.js',
  './js/gcal.js',
  './js/backup.js',
  './js/util/date.js',
  './js/util/dom.js',
  './js/util/layout.js',
  './js/store/index.js',
  './js/store/local.js',
  './js/model/routine.js',
  './js/model/quotes.js',
  './js/model/terms.js',
  './js/components/icons.js',
  './js/components/sheet.js',
  './js/components/toast.js',
  './js/components/chips.js',
  './js/components/rows.js',
  './js/components/taskActions.js',
  './js/components/taskEditor.js',
  './js/components/routineEditor.js',
  './js/components/categoryEditor.js',
  './js/components/dayPanel.js',
  './js/components/quoteCard.js',
  './js/components/gcalUI.js',
  './js/views/today.js',
  './js/views/calendar.js',
  './js/views/backlog.js',
  './js/views/routines.js',
  './js/views/categories.js',
  './js/views/more.js',
  './js/views/quotes.js',
  './js/views/gcalSettings.js',
  './js/views/terms.js',
  './js/views/placeholder.js',
];

self.addEventListener('install', (event) => {
  // 새 버전은 받아만 두고, 사용자가 "업데이트"를 누르면 교체 (입력 중 갑자기 바뀌지 않게)
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('haru-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 구글 로그인·캘린더 API 등 다른 주소의 요청은 건드리지 않음
  if (url.origin !== self.location.origin) return;

  // 화면 이동(앱 열기): 저장된 index.html 먼저 → 인터넷 없어도 열림
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }
  // 앱 파일: 저장된 것 먼저, 없으면 인터넷에서
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
