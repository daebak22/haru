// 카테고리 추가/수정 시트 (더보기 → 카테고리, 할 일·루틴 입력창의 "+ 새 카테고리"에서 사용)
import * as store from '../store/index.js';
import { state } from '../state.js';
import { PALETTE } from '../config.js';
import { esc, safeColor } from '../util/dom.js';
import { icons } from './icons.js';
import { openSheet, confirmBox } from './sheet.js';
import { toast } from './toast.js';

// onSaved(id): 저장 후 호출 (새로 만든 카테고리를 바로 선택할 때 사용)
export function openCategoryEditor(cat = null, { onSaved } = {}) {
  const isNew = !cat;
  const used = new Set(state.categories.map((c) => c.color.toLowerCase()));
  let color = cat?.color || PALETTE.find((c) => !used.has(c.toLowerCase())) || PALETTE[0];

  const body = `
    <form class="form" id="cat-form" autocomplete="off">
      <input class="input title-input" name="name" placeholder="카테고리 이름 (예: 영어, 독서)" maxlength="20" value="${esc(cat?.name)}" enterkeyhint="done" aria-label="카테고리 이름">
      <div class="cat-preview"><span class="tag" data-preview style="--c:${safeColor(color)}">${esc(cat?.name || '미리보기')}</span></div>
      <div class="field">
        <span class="field-label">색상</span>
        <div class="palette">${PALETTE.map((c) => `<button type="button" class="swatch-btn" data-color="${c}" style="--c:${c}" aria-label="색 ${c}">${icons.check}</button>`).join('')}</div>
        <label class="row-inline custom-color"><span>원하는 색 직접 고르기</span><input type="color" name="custom" value="${safeColor(color)}"></label>
      </div>
      ${
        isNew
          ? ''
          : `<label class="switch-row"><span>숨기기<br><small class="muted">새 할 일에서 고를 수 없게 해요. 지난 기록의 색은 그대로예요.</small></span><input type="checkbox" class="switch" name="archived" ${cat.archived ? 'checked' : ''}></label>`
      }
    </form>`;
  const footer = `${isNew ? '' : '<button type="button" class="btn danger" data-delete>삭제</button>'}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" data-close>취소</button>
    <button type="submit" form="cat-form" class="btn primary">${isNew ? '만들기' : '저장'}</button>`;

  openSheet({
    title: isNew ? '새 카테고리' : '카테고리 수정',
    body,
    footer,
    onMount(el, close) {
      const form = el.querySelector('#cat-form');
      const f = form.elements;
      const preview = el.querySelector('[data-preview]');
      const sync = () => {
        el.querySelectorAll('[data-color]').forEach((b) =>
          b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === color.toLowerCase()))
        );
        f.custom.value = safeColor(color);
        preview.style.setProperty('--c', safeColor(color));
        preview.textContent = f.name.value.trim() || '미리보기';
      };
      sync();
      f.name.addEventListener('input', sync);
      el.querySelector('.palette').addEventListener('click', (e) => {
        const b = e.target.closest('[data-color]');
        if (!b) return;
        color = b.dataset.color;
        sync();
      });
      f.custom.addEventListener('input', () => {
        color = f.custom.value;
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
        let id = cat?.id;
        if (isNew) {
          const order = Math.max(-1, ...state.categories.map((c) => c.order || 0)) + 1;
          id = store.add('categories', { name, color: safeColor(color), order, archived: false });
          toast(`"${name}" 카테고리를 만들었어요`);
        } else {
          store.patch('categories', cat.id, { name, color: safeColor(color), archived: !!f.archived?.checked });
        }
        close();
        onSaved?.(id);
      });
      el.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmBox(
          `"${cat.name}" 카테고리를 삭제할까요? 이 카테고리의 할 일과 루틴은 "분류 없음"이 돼요. 지난 기록 색을 남기려면 삭제 대신 "숨기기"를 써 주세요.`,
          { ok: '삭제', danger: true }
        );
        if (!ok) return;
        const [tasks, routines] = await Promise.all([
          store.query('tasks', { field: 'categoryId', eq: cat.id }),
          store.query('routines', { field: 'categoryId', eq: cat.id }),
        ]);
        await store.batch([
          { op: 'remove', col: 'categories', id: cat.id },
          ...tasks.map((x) => ({ op: 'patch', col: 'tasks', id: x.id, data: { categoryId: null } })),
          ...routines.map((x) => ({ op: 'patch', col: 'routines', id: x.id, data: { categoryId: null } })),
        ]);
        close();
        toast('카테고리를 삭제했어요');
      });
      if (isNew) f.name.focus();
    },
  });
}
