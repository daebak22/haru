// 루틴 추가/수정 시트
import * as store from '../store/index.js';
import { state } from '../state.js';
import { today, weekdayName } from '../util/date.js';
import { esc } from '../util/dom.js';
import { MON_FIRST } from '../model/routine.js';
import { openSheet, confirmBox } from './sheet.js';
import { toast } from './toast.js';
import { catChipsHTML, setupCatPicker, lastCategory } from './chips.js';

export function openRoutineEditor(routine = null) {
  const isNew = !routine;
  const t = today();
  const rep = structuredClone(routine?.repeat || { type: 'daily' });
  const weekdays = new Set(rep.weekdays || []);
  const monthDays = new Set(rep.monthDays || []);
  let type = rep.type || 'daily';
  let curCat = routine ? routine.categoryId : lastCategory();
  if (curCat && !state.catMap[curCat]) curCat = null;

  const body = `
    <form class="form" id="routine-form" autocomplete="off">
      <input class="input title-input" name="title" placeholder="루틴 이름 (예: 스트레칭)" maxlength="120" value="${esc(routine?.title)}" enterkeyhint="done" aria-label="루틴 이름">
      <div class="field">
        <span class="field-label">반복</span>
        <div class="seg" data-types>
          <button type="button" data-type="daily">매일</button>
          <button type="button" data-type="weekly">매주</button>
          <button type="button" data-type="monthly">매월</button>
        </div>
      </div>
      <div class="field" data-weekly>
        <span class="field-label">요일</span>
        <div class="toggles">${MON_FIRST.map((i) => `<button type="button" class="toggle${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}" data-wd="${i}">${weekdayName(i)}</button>`).join('')}</div>
      </div>
      <div class="field" data-monthly>
        <span class="field-label">날짜</span>
        <div class="toggles">${Array.from({ length: 31 }, (_, i) => `<button type="button" class="toggle" data-md="${i + 1}">${i + 1}</button>`).join('')}</div>
        <p class="hint">29~31일을 고르면 그 날짜가 없는 달은 말일에 표시돼요.</p>
      </div>
      <div class="field">
        <span class="field-label">시간 <small>(선택)</small></span>
        <div class="row-inline">
          <input type="time" class="input auto" name="time" value="${esc(routine?.time || '')}" aria-label="시간">
          <button type="button" class="btn ghost small" data-clear-time>시간 없음</button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">카테고리</span>
        <div class="chips" data-cats>${catChipsHTML(curCat)}</div>
      </div>
      <div class="field two">
        <label><span class="field-label">시작일</span><input type="date" class="input" name="startDate" value="${esc(routine?.startDate || t)}"></label>
        <label><span class="field-label">종료일 <small>(비우면 계속)</small></span><input type="date" class="input" name="endDate" value="${esc(routine?.endDate || '')}"></label>
      </div>
      <div class="field">
        <span class="field-label">메모</span>
        <textarea class="input" name="memo" rows="2" maxlength="2000" placeholder="(선택)">${esc(routine?.memo)}</textarea>
      </div>
      <label class="switch-row"><span>사용 중</span><input type="checkbox" class="switch" name="active" ${routine?.active === false ? '' : 'checked'}></label>
    </form>`;
  const footer = `${isNew ? '' : '<button type="button" class="btn danger" data-delete>삭제</button>'}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" data-close>취소</button>
    <button type="submit" form="routine-form" class="btn primary">${isNew ? '추가' : '저장'}</button>`;

  let stopCats = null;
  openSheet({
    title: isNew ? '루틴 추가' : '루틴 수정',
    body,
    footer,
    onClose: () => stopCats?.(),
    onMount(el, close) {
      const form = el.querySelector('#routine-form');
      const f = form.elements;
      const sync = () => {
        el.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
        el.querySelector('[data-weekly]').hidden = type !== 'weekly';
        el.querySelector('[data-monthly]').hidden = type !== 'monthly';
        el.querySelectorAll('[data-wd]').forEach((b) => b.setAttribute('aria-pressed', String(weekdays.has(+b.dataset.wd))));
        el.querySelectorAll('[data-md]').forEach((b) => b.setAttribute('aria-pressed', String(monthDays.has(+b.dataset.md))));
      };
      sync();
      el.querySelector('[data-types]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-type]');
        if (!b) return;
        type = b.dataset.type;
        if (type === 'weekly' && !weekdays.size) weekdays.add(new Date().getDay());
        if (type === 'monthly' && !monthDays.size) monthDays.add(new Date().getDate());
        sync();
      });
      el.querySelector('[data-weekly]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-wd]');
        if (!b) return;
        const v = +b.dataset.wd;
        weekdays.has(v) ? weekdays.delete(v) : weekdays.add(v);
        sync();
      });
      el.querySelector('[data-monthly]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-md]');
        if (!b) return;
        const v = +b.dataset.md;
        monthDays.has(v) ? monthDays.delete(v) : monthDays.add(v);
        sync();
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
        if (type === 'weekly' && !weekdays.size) return toast('요일을 하나 이상 골라 주세요');
        if (type === 'monthly' && !monthDays.size) return toast('날짜를 하나 이상 골라 주세요');
        const startDate = f.startDate.value || t;
        const endDate = f.endDate.value || null;
        if (endDate && endDate < startDate) return toast('종료일이 시작일보다 빨라요');
        const data = {
          title,
          categoryId: curCat,
          time: f.time.value || null,
          memo: f.memo.value.trim(),
          repeat: {
            type,
            weekdays: type === 'weekly' ? [...weekdays].sort() : [],
            monthDays: type === 'monthly' ? [...monthDays].sort((a, b) => a - b) : [],
          },
          startDate,
          endDate,
          active: f.active.checked,
        };
        if (isNew) {
          store.add('routines', { ...data, order: Date.now() });
          toast('루틴을 추가했어요');
        } else {
          store.patch('routines', routine.id, data);
        }
        close();
      });

      el.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmBox('이 루틴을 삭제할까요? 지난 완료 기록도 달력 통계에서 빠져요.', { ok: '삭제', danger: true });
        if (!ok) return;
        store.remove('routines', routine.id);
        close();
        toast('루틴을 삭제했어요', { action: '되돌리기', onAction: () => store.restore('routines', routine) });
      });

      if (isNew) f.title.focus();
    },
  });
}
