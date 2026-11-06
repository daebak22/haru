// 앱 시작점
import { startState, seedIfEmpty } from './state.js';
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
import { prepare as prepareGcal } from './gcal.js';
import { setupServiceWorker } from './pwa.js';
import { placeholder } from './views/placeholder.js';

router.register('today', todayView);
router.register('calendar', calendarView);
router.register('planner', placeholder('데일리 플래너', 3, 'D-Day, 체크리스트, 10분 단위 타임테이블이 들어갈 자리예요.', 'planner'));
router.register('projects', placeholder('프로젝트', 4, '프로젝트 기간, 세부 체크리스트, 진행률 막대가 들어갈 자리예요.', 'projects'));
router.register('more', moreView);
router.register('backlog', backlogView);
router.register('routines', routinesView);
router.register('categories', categoriesView);
router.register('quotes', quotesView);
router.register('gcal', gcalSettingsView);

window.addEventListener('haru:storage-error', () => toast('저장 공간이 부족해 저장하지 못했어요. 백업 후 오래된 데이터를 정리해 주세요.'));

startState();
seedIfEmpty();
router.start();
prepareGcal();
setupServiceWorker();

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
