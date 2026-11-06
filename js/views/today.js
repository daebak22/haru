// 오늘 화면 (앱을 열면 처음 보이는 화면)
// 태블릿 가로에서는 달력 + 오늘 목록 두 영역으로 보여준다.
import * as store from '../store/index.js';
import { onState } from '../state.js';
import { today, addDays } from '../util/date.js';
import { isWide } from '../util/layout.js';
import { frame, setHTML } from '../util/dom.js';
import { icons } from '../components/icons.js';
import { dayPanelHTML, bindDayPanel } from '../components/dayPanel.js';
import * as calendar from './calendar.js';
import { onGcal } from '../gcal.js';
import { monthRangeOf, autoRefresh } from '../components/gcalUI.js';

export function mount(root) {
  if (isWide()) return calendar.mount(root, { selectToday: true });

  const t = today();
  let tasks = [];
  let dayDoc = null;

  const render = frame(() => {
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="today">${dayPanelHTML({ date: t, tasks, dayDoc })}</div>
       <button type="button" class="fab" data-act="add" aria-label="할 일 추가">${icons.plus}</button>`
    );
  });

  // 읽기 절약: 오늘 기준 14일 전 ~ 오늘 할 일만 (지난 미완료 확인용)
  const unsubs = [
    store.watch('tasks', { field: 'date', gte: addDays(t, -14), lte: t }, (d) => {
      tasks = d;
      render();
    }),
    store.watchDoc('days', t, (d) => {
      dayDoc = d;
      render();
    }),
    onState(render),
    onGcal(render),
    bindDayPanel(root, () => ({ date: t, tasks, dayDoc })),
  ];
  render();
  const r = monthRangeOf(t);
  autoRefresh(r.from, r.to);
  return () => unsubs.forEach((u) => u());
}
