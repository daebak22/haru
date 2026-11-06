// 할 일 추가/수정 시트
import * as store from '../store/index.js';
import { state } from '../state.js';
import { today, addDays } from '../util/date.js';
import { esc } from '../util/dom.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';
import { catChipsHTML, setupCatPicker, lastCategory, rememberCategory } from './chips.js';
import { deleteTask } from './taskActions.js';

// date: undefined → 오늘, null → 보관함, 'YYYY-MM-DD' → 그 날짜
export function openTaskEditor({ task = null, date, projectId = null } = {}) {
  const isNew = !task;
  const curProject = task ? task.projectId || null : projectId;
  const projects = state.projects.filter((p) => p.status !== 'done' || p.id === curProject);
  const projectField = projects.length
    ? `<div class="field">
        <span class="field-label">프로젝트 <small>(선택)</small></span>
        <select class="input" name="projectId" aria-label="프로젝트"><option value="">연결 안 함</option>${projects
          .map((p) => `<option value="${esc(p.id)}" ${p.id === curProject ? 'selected' : ''}>${esc(p.name)}</option>`)
          .join('')}</select>
      </div>`
    : '';
  const t = today();
  const tm = addDays(t, 1);
  let curDate = task ? task.date : date === undefined ? t : date;
  let curCat = task ? task.categoryId : lastCategory();
  if (curCat && !state.catMap[curCat]) curCat = null;

  const body = `
    <form class="form" id="task-form" autocomplete="off">
      <input class="input title-input" name="title" placeholder="무엇을 할까요?" maxlength="120" value="${esc(task?.title)}" enterkeyhint="done" aria-label="할 일 이름">
      <div class="field">
        <span class="field-label">날짜</span>
        <div class="chips" data-dates>
          <button type="button" class="chip" data-date="${t}">오늘</button>
          <button type="button" class="chip" data-date="${tm}">내일</button>
          <button type="button" class="chip" data-date="">보관함</button>
          <input type="date" class="chip chip-date" name="date" value="${esc(curDate || '')}" aria-label="날짜 직접 선택">
        </div>
      </div>
      <div class="field" data-time-field>
        <span class="field-label">시간 <small>(선택)</small></span>
        <div class="row-inline">
          <input type="time" class="input auto" name="time" value="${esc(task?.time || '')}" aria-label="시간">
          <button type="button" class="btn ghost small" data-clear-time>시간 없음</button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">카테고리</span>
        <div class="chips" data-cats>${catChipsHTML(curCat)}</div>
      </div>
      ${projectField}
      <div class="field">
        <span class="field-label">메모</span>
        <textarea class="input" name="memo" rows="3" maxlength="2000" placeholder="자세한 내용 (선택)">${esc(task?.memo)}</textarea>
      </div>
    </form>`;
  const footer = `${isNew ? '' : '<button type="button" class="btn danger" data-delete>삭제</button>'}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" data-close>취소</button>
    <button type="submit" form="task-form" class="btn primary">${isNew ? '추가' : '저장'}</button>`;

  let stopCats = null;
  openSheet({
    title: isNew ? '할 일 추가' : '할 일 수정',
    body,
    footer,
    onClose: () => stopCats?.(),
    onMount(el, close) {
      const form = el.querySelector('#task-form');
      const f = form.elements;
      const timeField = el.querySelector('[data-time-field]');
      const syncDate = () => {
        el.querySelectorAll('[data-dates] [data-date]').forEach((b) =>
          b.setAttribute('aria-pressed', String(b.dataset.date === (curDate || '')))
        );
        f.date.classList.toggle('has-value', !!curDate && curDate !== t && curDate !== tm);
        timeField.hidden = !curDate; // 보관함 할 일은 시간 없음
      };
      syncDate();
      el.querySelector('[data-dates]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-date]');
        if (!b) return;
        curDate = b.dataset.date || null;
        f.date.value = curDate || '';
        syncDate();
      });
      f.date.addEventListener('change', () => {
        curDate = f.date.value || null;
        syncDate();
      });
      el.querySelector('[data-clear-time]').addEventListener('click', () => (f.time.value = ''));
      stopCats = setupCatPicker(
        el.querySelector('[data-cats]'),
        () => curCat,
        (v) => (curCat = v)
      );

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = f.title.value.trim();
        if (!title) {
          f.title.focus();
          f.title.classList.remove('shake');
          void f.title.offsetWidth;
          f.title.classList.add('shake');
          return;
        }
        const data = {
          title,
          date: curDate || null,
          time: curDate ? f.time.value || null : null,
          memo: f.memo.value.trim(),
          categoryId: curCat,
          projectId: f.projectId ? f.projectId.value || null : curProject,
        };
        if (isNew) {
          store.add('tasks', { ...data, done: false, doneAt: null, postponed: 0, spentSec: 0, order: Date.now() });
          rememberCategory(curCat);
          toast(data.date ? '할 일을 추가했어요' : '보관함에 넣었어요');
        } else {
          store.patch('tasks', task.id, data);
        }
        close();
      });

      el.querySelector('[data-delete]')?.addEventListener('click', () => {
        deleteTask(task);
        close();
      });

      if (isNew) f.title.focus();
    },
  });
}
