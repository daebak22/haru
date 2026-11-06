// 서비스 워커: 앱 파일을 기기에 저장해서 인터넷 없이도 열리게 하고, 새 버전을 감지한다.
// ★ 파일을 고쳐서 배포할 때마다 VERSION을 올린다 (js/config.js의 VERSION과 같게).
// ★ 새 파일을 만들면 아래 FILES 목록에 추가한다.
const VERSION = '0.7.0';
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
  './js/views/planner.js',
  './js/timer.js',
  './js/model/timetable.js',
  './js/components/timerUI.js',
  './js/components/dday.js',
  './js/components/timetable.js',
  './js/views/projects.js',
  './js/model/project.js',
  './js/components/projectEditor.js',
  './js/firebase.js',
  './js/account.js',
  './js/migrate.js',
  './js/store/cloud.js',
  './js/views/login.js',
  './js/components/diary.js',
];

// Firebase SDK(구글 공식, 버전 고정 주소) — 오프라인에서도 앱이 열리도록 함께 저장
const SDK = ['app', 'auth', 'firestore'].map((m) => `https://www.gstatic.com/firebasejs/12.19.0/firebase-${m}.js`);

self.addEventListener('install', (event) => {
  // 새 버전은 받아만 두고, 사용자가 "업데이트"를 누르면 교체 (입력 중 갑자기 바뀌지 않게)
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      await c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })));
      await c.addAll(SDK).catch(() => {}); // 실패해도 설치는 계속 (처음 열 때 다시 저장)
    })
  );
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
  // Firebase SDK 파일: 저장된 것 먼저 (버전 고정 주소라 내용이 바뀌지 않음)
  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }
  // 구글 로그인·캘린더 API·Firestore 등 다른 주소의 요청은 건드리지 않음
  if (url.origin !== self.location.origin) return;

  // 화면 이동(앱 열기): 저장된 index.html 먼저 → 인터넷 없어도 열림
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }
  // 앱 파일: 저장된 것 먼저, 없으면 인터넷에서
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
