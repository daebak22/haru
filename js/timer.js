// 공부·일 타이머
// 1초씩 세지 않고 "시작 시각"만 설정 문서에 저장한다.
// → 화면이 꺼지거나 앱을 닫아도, 다시 열면 (지금 − 시작 시각)으로 정확한 시간이 나온다.
// 멈추면 기록(days.sessions)을 남기고, 그 시간대의 10분 칸(5분 이상 걸친 칸)을 카테고리 색으로 칠한다.
import * as store from './store/index.js';
import { state, updateSettings } from './state.js';
import { cellsForRange, splitByDay, fmtClock } from './model/timetable.js';

export const running = () => (state.settings.timer && state.settings.timer.startedAt ? state.settings.timer : null);
export const elapsedMs = () => {
  const t = running();
  return t ? Date.now() - t.startedAt : 0;
};

export function startTimer({ categoryId, taskId = null }) {
  if (running()) return;
  updateSettings({ timer: { categoryId, taskId, startedAt: Date.now() } });
}

export function cancelTimer() {
  return updateSettings({ timer: null });
}

// 멈추고 기록. endAt: 끝난 시각(ms). 반환: 기록한 시간(ms) 또는 0
export async function stopTimer(endAt = Date.now()) {
  const t = running();
  if (!t) return 0;
  const start = t.startedAt;
  const end = Math.max(start, Math.min(endAt, Date.now()));
  await updateSettings({ timer: null });
  const dur = end - start;
  if (dur < 60 * 1000) return 0;

  const cat = t.categoryId || '_';
  const sid = store.newId();
  const cellMap = cellsForRange(start, end);
  const parts = splitByDay(start, end);
  const dates = new Set([...Object.keys(cellMap), ...parts.map((p) => p.date)]);
  const ops = [];
  for (const date of dates) {
    const data = { date };
    const idx = cellMap[date] || [];
    if (idx.length) data.cells = Object.fromEntries(idx.map((i) => [i, cat]));
    const ps = parts.filter((p) => p.date === date);
    if (ps.length) {
      data.sessions = Object.fromEntries(
        ps.map((p, k) => [`${sid}-${k}`, { start: p.start, end: p.end, categoryId: t.categoryId || null, taskId: t.taskId || null }])
      );
    }
    ops.push({ op: 'patch', col: 'days', id: date, data });
  }
  if (t.taskId) {
    const task = await store.get('tasks', t.taskId);
    if (task) ops.push({ op: 'patch', col: 'tasks', id: t.taskId, data: { spentSec: (task.spentSec || 0) + Math.round(dur / 1000) } });
  }
  await store.batch(ops);
  return dur;
}

// 화면에 있는 경과 시간 표시([data-elapsed])를 1초마다 갱신
export function startTicker() {
  const tick = () => {
    const els = document.querySelectorAll('[data-elapsed]');
    if (!els.length) return;
    const text = fmtClock(elapsedMs());
    els.forEach((el) => {
      if (el.textContent !== text) el.textContent = text;
    });
  };
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', tick);
}
