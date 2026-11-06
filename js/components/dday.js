// D-Day: 목표 이름 + 남은 일수 (여러 개). 설정 문서의 ddays에 저장
import * as store from '../store/index.js';
import { state, onState, updateSettings } from '../state.js';
import { today, diffDays, fmtShort } from '../util/date.js';
import { esc } from '../util/dom.js';
import { icons } from './icons.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';

export function ddayLabel(date) {
  const n = diffDays(today(), date);
  if (n === 0) return 'D-Day';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export const ddayList = () =>
  Object.entries(state.settings.ddays || {})
    .map(([id, d]) => ({ id, ...d }))
    .filter((d) => d.title && d.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// manage: 관리 버튼 표시 여부
export function ddayChipsHTML({ manage = false } = {}) {
  const list = ddayList();
  if (!list.length && !manage) return '';
  return `<div class="dday-row">${list
    .map((d) => `<span class="dday${diffDays(today(), d.date) < 0 ? ' past' : ''}"><span>${esc(d.title)}</span><b>${ddayLabel(d.date)}</b></span>`)
    .join('')}${manage ? `<button type="button" class="btn small ghost" data-act="dday-manage">${list.length ? 'D-Day 관리' : '+ D-Day 추가'}</button>` : ''}</div>`;
}

export function openDdaySheet() {
  let unState = null;
  const listHTML = () => {
    const list = ddayList();
    return list.length
      ? list
          .map(
            (d) => `<div class="row" data-did="${esc(d.id)}">
              <div class="row-body"><div class="row-title">${esc(d.title)}</div><div class="row-meta"><span>${fmtShort(d.date)} · ${esc(d.date)}</span><b class="time">${ddayLabel(d.date)}</b></div></div>
              <button type="button" class="icon-btn" data-del aria-label="삭제">${icons.trash}</button>
            </div>`
          )
          .join('')
      : '<p class="empty small">아직 D-Day가 없어요.</p>';
  };
  openSheet({
    title: 'D-Day 관리',
    body: `<div class="list" data-dlist>${listHTML()}</div>
      <form class="form dday-form" data-dform autocomplete="off">
        <span class="field-label">새 D-Day</span>
        <input class="input" name="title" placeholder="목표 이름 (예: 투자자산운용사 시험)" maxlength="30">
        <div class="row-inline"><input class="input" type="date" name="date" value="${today()}"><button type="submit" class="btn primary">추가</button></div>
      </form>`,
    onMount(el) {
      const listEl = el.querySelector('[data-dlist]');
      unState = onState(() => (listEl.innerHTML = listHTML()));
      el.querySelector('[data-dform]').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const title = f.title.value.trim();
        if (!title || !f.date.value) {
          toast('목표 이름과 날짜를 넣어 주세요');
          return;
        }
        updateSettings({ ddays: { [store.newId()]: { title, date: f.date.value } } });
        f.title.value = '';
      });
      listEl.addEventListener('click', (e) => {
        const row = e.target.closest('[data-del]')?.closest('[data-did]');
        if (!row) return;
        const id = row.dataset.did;
        const before = state.settings.ddays[id];
        updateSettings({ ddays: { [id]: store.DEL } });
        toast('D-Day를 삭제했어요', { action: '되돌리기', onAction: () => updateSettings({ ddays: { [id]: before } }) });
      });
    },
    onClose: () => unState?.(),
  });
}
