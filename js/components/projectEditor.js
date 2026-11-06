// 프로젝트 추가/수정 시트 (이름, 상태, 기간, 색상, 메모)
import * as store from '../store/index.js';
import { state } from '../state.js';
import { PALETTE } from '../config.js';
import { today, addDays } from '../util/date.js';
import { esc, safeColor } from '../util/dom.js';
import { STATUS } from '../model/project.js';
import { icons } from './icons.js';
import { openSheet, confirmBox } from './sheet.js';
import { toast } from './toast.js';

// onSaved(id): 저장 후 호출
export function openProjectEditor(p = null, { onSaved, onDeleted } = {}) {
  const isNew = !p;
  const t = today();
  let status = p?.status || 'active';
  const used = new Set(state.projects.map((x) => (x.color || '').toLowerCase()));
  let color = p?.color || PALETTE.find((c) => !used.has(c.toLowerCase())) || PALETTE[6];

  const body = `
    <form class="form" id="proj-form" autocomplete="off">
      <input class="input title-input" name="name" placeholder="프로젝트 이름 (예: 하반기 공채 준비)" maxlength="40" value="${esc(p?.name)}" enterkeyhint="done" aria-label="프로젝트 이름">
      <div class="field">
        <span class="field-label">상태</span>
        <div class="seg" data-status>${STATUS.map((s) => `<button type="button" data-st="${s.id}">${s.name}</button>`).join('')}</div>
      </div>
      <div class="field two">
        <label><span class="field-label">시작일</span><input type="date" class="input" name="startDate" value="${esc(p?.startDate || t)}"></label>
        <label><span class="field-label">종료일</span><input type="date" class="input" name="endDate" value="${esc(p?.endDate || addDays(t, 30))}"></label>
      </div>
      <div class="field">
        <span class="field-label">색상</span>
        <div class="palette">${PALETTE.map((c) => `<button type="button" class="swatch-btn" data-color="${c}" style="--c:${c}" aria-label="색 ${c}">${icons.check}</button>`).join('')}</div>
      </div>
      <div class="field">
        <span class="field-label">메모</span>
        <textarea class="input" name="memo" rows="3" maxlength="3000" placeholder="목표, 참고 링크 등 (선택)">${esc(p?.memo)}</textarea>
      </div>
    </form>`;
  const footer = `${isNew ? '' : '<button type="button" class="btn danger" data-delete>삭제</button>'}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" data-close>취소</button>
    <button type="submit" form="proj-form" class="btn primary">${isNew ? '만들기' : '저장'}</button>`;

  openSheet({
    title: isNew ? '새 프로젝트' : '프로젝트 수정',
    body,
    footer,
    onMount(el, close) {
      const form = el.querySelector('#proj-form');
      const f = form.elements;
      const sync = () => {
        el.querySelectorAll('[data-st]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.st === status)));
        el.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === color.toLowerCase())));
      };
      sync();
      el.querySelector('[data-status]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-st]');
        if (!b) return;
        status = b.dataset.st;
        sync();
      });
      el.querySelector('.palette').addEventListener('click', (e) => {
        const b = e.target.closest('[data-color]');
        if (!b) return;
        color = b.dataset.color;
        sync();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = f.name.value.trim();
        if (!name) {
          f.name.focus();
          f.name.classList.remove('shake');
          void f.name.offsetWidth;
          f.name.classList.add('shake');
          return;
        }
        const startDate = f.startDate.value || null;
        const endDate = f.endDate.value || null;
        if (startDate && endDate && endDate < startDate) return toast('종료일이 시작일보다 빨라요');
        const data = { name, status, startDate, endDate, color: safeColor(color), memo: f.memo.value.trim() };
        let id = p?.id;
        if (isNew) {
          id = store.add('projects', { ...data, items: {}, order: Date.now() });
          toast('프로젝트를 만들었어요');
        } else {
          store.patch('projects', p.id, data);
        }
        close();
        onSaved?.(id);
      });
      el.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmBox(`"${p.name}" 프로젝트를 삭제할까요? 세부 체크리스트도 함께 지워지고, 연결된 할 일은 연결만 풀려요.`, { ok: '삭제', danger: true });
        if (!ok) return;
        const tasks = await store.query('tasks', { field: 'projectId', eq: p.id });
        await store.batch([
          { op: 'remove', col: 'projects', id: p.id },
          ...tasks.map((x) => ({ op: 'patch', col: 'tasks', id: x.id, data: { projectId: null } })),
        ]);
        close();
        toast('프로젝트를 삭제했어요');
        onDeleted?.();
      });
      if (isNew) f.name.focus();
    },
  });
}
