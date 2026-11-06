// 카테고리 관리 (이름, 색, 순서, 숨기기, 삭제)
import * as store from '../store/index.js';
import { state, onState } from '../state.js';
import { esc, frame, setHTML, safeColor } from '../util/dom.js';
import { icons } from '../components/icons.js';
import { openCategoryEditor } from '../components/categoryEditor.js';

export function mount(root) {
  const render = frame(() => {
    const cats = state.categories;
    const rows = cats
      .map(
        (c, i) => `<div class="row${c.archived ? ' inactive' : ''}" data-cid="${esc(c.id)}">
          <span class="swatch" style="background:${safeColor(c.color)}"></span>
          <div class="row-body" data-act="edit"><div class="row-title">${esc(c.name)}</div>${c.archived ? '<div class="row-meta"><span>숨김</span></div>' : ''}</div>
          <button type="button" class="icon-btn" data-act="up" aria-label="위로" ${i === 0 ? 'disabled' : ''}>${icons.up}</button>
          <button type="button" class="icon-btn" data-act="down" aria-label="아래로" ${i === cats.length - 1 ? 'disabled' : ''}>${icons.down}</button>
        </div>`
      )
      .join('');
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="cats">
        <header class="page-head">
          <a class="icon-btn" href="#more" aria-label="뒤로">${icons.left}</a>
          <h1>카테고리</h1>
        </header>
        <p class="hint">이름을 누르면 색을 바꿀 수 있어요. 할 일을 추가할 때 <b>+ 새 카테고리</b>로 바로 만들 수도 있어요.</p>
        <div class="list">${rows || '<p class="empty">카테고리가 없어요.<br><b>+</b> 버튼으로 만들어 보세요.</p>'}</div>
      </div>
      <button type="button" class="fab" data-act="add" aria-label="카테고리 추가">${icons.plus}</button>`
    );
  });

  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const cats = state.categories;
    const idx = cats.findIndex((c) => c.id === el.closest('[data-cid]')?.dataset.cid);
    const cat = cats[idx];
    switch (el.dataset.act) {
      case 'add':
        openCategoryEditor();
        break;
      case 'edit':
        if (cat) openCategoryEditor(cat);
        break;
      case 'up':
      case 'down': {
        const j = el.dataset.act === 'up' ? idx - 1 : idx + 1;
        if (!cat || !cats[j]) break;
        // 순서 번호를 다시 매겨서 두 항목 자리 바꾸기
        const order = cats.map((c) => c.id);
        [order[idx], order[j]] = [order[j], order[idx]];
        store.batch(order.map((id, k) => ({ op: 'patch', col: 'categories', id, data: { order: k } })));
        break;
      }
    }
  };
  root.addEventListener('click', onClick);
  const unState = onState(render);
  render();
  return () => {
    root.removeEventListener('click', onClick);
    unState();
  };
}
