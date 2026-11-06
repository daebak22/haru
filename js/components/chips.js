// 카테고리 선택 칩과 칩 묶음 동작
import { state, onState } from '../state.js';
import { esc, safeColor } from '../util/dom.js';
import { openCategoryEditor } from './categoryEditor.js';

export function catChipsHTML(selectedId) {
  const cats = state.categories.filter((c) => !c.archived || c.id === selectedId);
  return (
    `<button type="button" class="chip" data-cat="" aria-pressed="${!selectedId}">없음</button>` +
    cats
      .map(
        (c) =>
          `<button type="button" class="chip" data-cat="${esc(c.id)}" aria-pressed="${c.id === selectedId}"><i class="c" style="--c:${safeColor(c.color)}"></i>${esc(c.name)}</button>`
      )
      .join('') +
    '<button type="button" class="chip add-chip" data-newcat>+ 새 카테고리</button>'
  );
}

// 묶음 안에서 하나만 선택되게 (attr: data-cat → 'cat')
export function bindChips(container, attr, onPick) {
  container.addEventListener('click', (e) => {
    const b = e.target.closest(`[data-${attr}]`);
    if (!b || !container.contains(b)) return;
    container.querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onPick(b.dataset[attr]);
  });
}

// 입력창 안의 카테고리 칩 묶음: 선택 + "새 카테고리" 만들기 + 목록 자동 갱신
// 반환값: 정리 함수 (시트가 닫힐 때 호출)
export function setupCatPicker(container, getCur, setCur) {
  bindChips(container, 'cat', (v) => setCur(v || null));
  container.addEventListener('click', (e) => {
    if (!e.target.closest('[data-newcat]')) return;
    openCategoryEditor(null, {
      onSaved: (id) => {
        setCur(id);
        rememberCategory(id);
      },
    });
  });
  return onState(() => (container.innerHTML = catChipsHTML(getCur())));
}

// 이 기기에서 마지막으로 고른 카테고리 기억 (새 할 일 기본값)
export function lastCategory() {
  try {
    return localStorage.getItem('haru:lastCat') || null;
  } catch {
    return null;
  }
}
export function rememberCategory(id) {
  try {
    if (id) localStorage.setItem('haru:lastCat', id);
    else localStorage.removeItem('haru:lastCat');
  } catch {
    /* 무시 */
  }
}
