// 앱 시작점
import { startState, seedIfEmpty, migratePalette } from './state.js';
import { today } from './util/date.js';
import { toast } from './components/toast.js';
import * as router from './router.js';
import * as todayView from './views/today.js';
import * as calendarView from './views/calendar.js';
import * as backlogView from './views/backlog.js';
import * as routinesView from './views/routines.js';
import * as categoriesView from './views/categories.js';
import * as moreView from './views/more.js';
import * as quotesView from './views/quotes.js';
import * as gcalSettingsView from './views/gcalSettings.js';
import * as termsView from './views/terms.js';
import * as plannerView from './views/planner.js';
import * as projectsView from './views/projects.js';
import { startTicker } from './timer.js';
import { prepare as prepareGcal } from './gcal.js';
import { setupServiceWorker } from './pwa.js';

router.register('today', todayView);
router.register('calendar', calendarView);
router.register('planner', plannerView);
router.register('projects', projectsView);
router.register('more', moreView);
router.register('backlog', backlogView);
router.register('routines', routinesView);
router.register('categories', categoriesView);
router.register('quotes', quotesView);
router.register('gcal', gcalSettingsView);
router.register('terms', termsView);

window.addEventListener('haru:storage-error', () => toast('저장 공간이 부족해 저장하지 못했어요. 백업 후 오래된 데이터를 정리해 주세요.'));
window.addEventListener('haru:sync-error', (e) => {
  const code = e.detail?.code || '';
  if (code.includes('permission-denied')) toast('동기화 권한 오류가 났어요. 다시 로그인해 주세요.');
  else if (code.includes('resource-exhausted')) toast('오늘 무료 사용량을 넘었어요. 내일 다시 동기화돼요. (입력은 이 기기에 저장돼요)');
});

// 인터넷이 끊기면 작은 안내 표시 (입력은 계속 가능, 연결되면 자동 저장)
function updateOnline() {
  document.body.classList.toggle('offline', !navigator.onLine);
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

function startApp(seedKey) {
  startState();
  seedIfEmpty(seedKey).then(migratePalette);
  router.start();
  prepareGcal();
  startTicker();
}

// 처음 로그인한 기기: 이 기기에만 있던 데이터를 계정으로 옮길지 물어봄 (계정마다 한 번)
async function maybeMigrate(cloud, uid) {
  const key = `haru:migrated:${uid}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch {
    return;
  }
  const { localSummary, migrateLocalToCloud } = await import('./migrate.js');
  const { n, meaningful } = await localSummary();
  const done = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* 무시 */
    }
  };
  if (!meaningful || !navigator.onLine) {
    if (navigator.onLine) done();
    return;
  }
  const { openSheet } = await import('./components/sheet.js');
  await new Promise((resolve) => {
    openSheet({
      title: '이 기기의 기록을 계정으로 옮길까요?',
      body: `<p class="confirm-msg">로그인 전에 이 기기에 저장한 기록이 있어요.<br>할 일 <b>${n.tasks}</b> · 루틴 <b>${n.routines}</b> · 프로젝트 <b>${n.projects}</b> · 날짜 기록 <b>${n.days}</b></p>
        <p class="hint">옮기면 다른 기기에서도 함께 보여요. 같은 이름의 카테고리는 하나로 합쳐요.</p>`,
      footer: `<button type="button" class="btn ghost" data-skip>옮기지 않기</button><span class="spacer"></span><button type="button" class="btn primary" data-go>옮기기</button>`,
      onMount(el, close) {
        el.querySelector('[data-go]').addEventListener('click', async () => {
          el.querySelector('[data-go]').disabled = true;
          const count = await migrateLocalToCloud(cloud);
          done();
          close();
          toast(`${count}개 항목을 계정으로 옮겼어요`);
        });
        el.querySelector('[data-skip]').addEventListener('click', () => {
          done();
          close();
        });
      },
      onClose: resolve,
    });
  });
}

async function boot() {
  setupServiceWorker(); // 로그인 전에도 앱 파일을 저장해 둠
  const { firebaseEnabled, loadFirebase, waitForUser } = await import('./firebase.js');
  if (!firebaseEnabled) {
    startApp(); // Firebase 설정 전: 이 기기에만 저장
    return;
  }
  let fb;
  try {
    fb = await loadFirebase();
  } catch (e) {
    console.error(e);
    const { showFatal } = await import('./views/login.js');
    showFatal('처음 한 번은 인터넷 연결이 필요해요. 연결한 뒤 다시 시도해 주세요.');
    return;
  }
  const user = await waitForUser(fb);
  if (!user) {
    const { showLogin } = await import('./views/login.js');
    showLogin(fb);
    return;
  }
  const [{ createCloud }, store, { account }] = await Promise.all([import('./store/cloud.js'), import('./store/index.js'), import('./account.js')]);
  const cloud = createCloud(fb, user.uid);
  store.useCloud(cloud);
  Object.assign(account, { user, fb });
  await maybeMigrate(cloud, user.uid);
  startApp(`haru:seeded:${user.uid}`);
}

boot();

// 앱을 켜 둔 채 하루가 바뀌면(06:00) 화면을 새 날짜로 다시 그림
let lastDay = today();
function checkDayChange() {
  if (today() !== lastDay) {
    lastDay = today();
    router.render();
  }
}
setInterval(checkDayChange, 60 * 1000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkDayChange());
