// 루틴 목록
import { state, onState, catColor } from '../state.js';
import { esc, frame, setHTML } from '../util/dom.js';
import { describeRepeat, sortRoutines } from '../model/routine.js';
import { icons } from '../components/icons.js';
import { openRoutineEditor } from '../components/routineEditor.js';

export function mount(root) {
  const render = frame(() => {
    const list = sortRoutines(state.routines).sort((a, b) => Number(a.active === false) - Number(b.active === false));
    const rows = list
      .map((r) => {
        const cat = state.catMap[r.categoryId];
        const meta = [
          r.time ? `<span class="time">${esc(r.time)}</span>` : '',
          `<span class="rep">${icons.repeat}${esc(describeRepeat(r.repeat))}</span>`,
          cat ? `<span class="tag" style="--c:${catColor(r.categoryId)}">${esc(cat.name)}</span>` : '',
          r.endDate ? `<span>~ ${esc(r.endDate)}</span>` : '',
          r.active === false ? '<span class="late">사용 안 함</span>' : '',
        ].join('');
        return `<div class="row${r.active === false ? ' inactive' : ''}" data-rid="${esc(r.id)}">
          <span class="swatch" style="background:${catColor(r.categoryId)}"></span>
          <div class="row-body" data-act="edit"><div class="row-title">${esc(r.title)}</div><div class="row-meta">${meta}</div></div>
          <button type="button" class="icon-btn" data-act="edit" aria-label="루틴 수정">${icons.edit}</button>
        </div>`;
      })
      .join('');
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="routines">
        <header class="page-head">
          <a class="icon-btn" href="#more" aria-label="뒤로">${icons.left}</a>
          <h1>루틴</h1>
        </header>
        <p class="hint">매일 · 매주 특정 요일 · 매월 특정 날짜에 자동으로 할 일 목록에 나타나요.</p>
        <div class="list">${rows || '<p class="empty">아직 루틴이 없어요. + 버튼으로 만들어 보세요.</p>'}</div>
      </div>
      <button type="button" class="fab" data-act="add" aria-label="루틴 추가">${icons.plus}</button>`
    );
  });

  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    if (el.dataset.act === 'add') openRoutineEditor();
    if (el.dataset.act === 'edit') {
      const r = state.routines.find((x) => x.id === el.closest('[data-rid]')?.dataset.rid);
      if (r) openRoutineEditor(r);
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
