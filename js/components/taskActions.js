// 할 일·루틴에 대한 동작 (완료, 미루기, 삭제 등)
import * as store from '../store/index.js';
import { today, addDays } from '../util/date.js';
import { vibrate } from '../util/dom.js';
import { openMenu } from './sheet.js';
import { toast } from './toast.js';
import { openTaskEditor } from './taskEditor.js';
import { openRoutineEditor } from './routineEditor.js';

export function toggleTask(task) {
  const done = !task.done;
  store.patch('tasks', task.id, { done, doneAt: done ? Date.now() : null });
  if (done) vibrate(12);
}

export function postponeTask(task) {
  const t = today();
  const base = task.date && task.date > t ? task.date : t;
  const before = { date: task.date, postponed: task.postponed || 0 };
  store.patch('tasks', task.id, { date: addDays(base, 1), postponed: before.postponed + 1 });
  toast('내일로 미뤘어요', { action: '되돌리기', onAction: () => store.patch('tasks', task.id, before) });
}

export function moveTask(task, date, message) {
  const before = { date: task.date, time: task.time ?? null };
  const data = date ? { date } : { date: null, time: null };
  store.patch('tasks', task.id, data);
  toast(message, { action: '되돌리기', onAction: () => store.patch('tasks', task.id, before) });
}

export function deleteTask(task) {
  store.remove('tasks', task.id);
  toast('삭제했어요', { action: '되돌리기', onAction: () => store.restore('tasks', task) });
}

export function moveOverdueToToday(list) {
  if (!list.length) return;
  const t = today();
  store.batch(list.map((x) => ({ op: 'patch', col: 'tasks', id: x.id, data: { date: t } })));
  toast(`${list.length}개를 오늘로 옮겼어요`, {
    action: '되돌리기',
    onAction: () => store.batch(list.map((x) => ({ op: 'patch', col: 'tasks', id: x.id, data: { date: x.date } }))),
  });
}

export function openTaskMenu(task) {
  const t = today();
  openMenu(task.title, [
    task.date !== t && { label: '오늘로 옮기기', icon: 'today', onClick: () => moveTask(task, t, '오늘로 옮겼어요') },
    task.date && { label: '내일로 미루기', icon: 'arrow', onClick: () => postponeTask(task) },
    { label: '수정 / 날짜 바꾸기', icon: 'edit', onClick: () => openTaskEditor({ task }) },
    task.date && { label: '보관함으로 보내기', icon: 'inbox', onClick: () => moveTask(task, null, '보관함으로 보냈어요') },
    { label: '삭제', icon: 'trash', danger: true, onClick: () => deleteTask(task) },
  ]);
}

export function toggleRoutine(routineId, date, dayDoc) {
  const done = !dayDoc?.routineDone?.[routineId];
  store.patch('days', date, { date, routineDone: { [routineId]: done ? true : store.DEL } });
  if (done) vibrate(12);
}

export function openRoutineMenu(r, date, dayDoc) {
  const skipped = !!dayDoc?.routineSkip?.[r.id];
  openMenu(r.title, [
    skipped
      ? { label: '건너뛰기 취소', icon: 'repeat', onClick: () => store.patch('days', date, { date, routineSkip: { [r.id]: store.DEL } }) }
      : {
          label: '이 날만 건너뛰기',
          icon: 'skip',
          onClick: () => store.patch('days', date, { date, routineSkip: { [r.id]: true }, routineDone: { [r.id]: store.DEL } }),
        },
    { label: '루틴 수정', icon: 'edit', onClick: () => openRoutineEditor(r) },
  ]);
}
