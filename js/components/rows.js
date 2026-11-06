// 할 일 한 줄 / 루틴 한 줄 그리기
import { state, catColor } from '../state.js';
import { esc } from '../util/dom.js';
import { fmtShort } from '../util/date.js';
import { describeRepeat } from '../model/routine.js';
import { icons } from './icons.js';

// 시간 정한 일 먼저(이른 시각 순), 그다음 시간 없는 일(추가한 순)
export const cmpTime = (a, b) => {
  const x = a || '99:99';
  const y = b || '99:99';
  return x < y ? -1 : x > y ? 1 : 0;
};

export const sortTasks = (arr) =>
  arr
    .slice()
    .sort((a, b) => cmpTime(a.time, b.time) || (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));

export function catMeta(categoryId) {
  const cat = state.catMap[categoryId];
  return cat ? `<span class="tag" style="--c:${catColor(categoryId)}">${esc(cat.name)}</span>` : '';
}

export function taskRowHTML(task, { showDate = false } = {}) {
  const meta = [];
  if (showDate && task.date) meta.push(`<span class="late">${fmtShort(task.date)}</span>`);
  if (task.time) meta.push(`<span class="time">${esc(task.time)}</span>`);
  meta.push(catMeta(task.categoryId));
  if (task.postponed) meta.push(`<span title="미룬 횟수">미룸 ${task.postponed}</span>`);
  if (task.memo) meta.push(`<span class="memo">${esc(task.memo.split('\n')[0].slice(0, 40))}</span>`);
  const metaHTML = meta.filter(Boolean).join('');
  return `<div class="row task${task.done ? ' done' : ''}" data-id="${esc(task.id)}">
    <button type="button" class="check" data-act="toggle" style="--c:${catColor(task.categoryId)}" aria-pressed="${!!task.done}" aria-label="${task.done ? '완료 취소' : '완료로 표시'}"><span class="box">${icons.check}</span></button>
    <div class="row-body" data-act="edit"><div class="row-title">${esc(task.title)}</div>${metaHTML ? `<div class="row-meta">${metaHTML}</div>` : ''}</div>
    <button type="button" class="icon-btn" data-act="menu" aria-label="할 일 메뉴">${icons.dots}</button>
  </div>`;
}

export function routineRowHTML(r, { done = false, skipped = false } = {}) {
  const meta = [`<span class="rep">${icons.repeat}${esc(describeRepeat(r.repeat))}</span>`];
  if (r.time) meta.unshift(`<span class="time">${esc(r.time)}</span>`);
  meta.push(catMeta(r.categoryId));
  if (skipped) meta.push('<span class="late">이 날은 건너뜀</span>');
  return `<div class="row routine${done ? ' done' : ''}${skipped ? ' skipped' : ''}" data-rid="${esc(r.id)}">
    <button type="button" class="check round" data-act="rtoggle" style="--c:${catColor(r.categoryId)}" aria-pressed="${done}" aria-label="${done ? '완료 취소' : '완료로 표시'}" ${skipped ? 'disabled' : ''}><span class="box">${icons.check}</span></button>
    <div class="row-body" data-act="rmenu"><div class="row-title">${esc(r.title)}</div><div class="row-meta">${meta.filter(Boolean).join('')}</div></div>
    <button type="button" class="icon-btn" data-act="rmenu" aria-label="루틴 메뉴">${icons.dots}</button>
  </div>`;
}
