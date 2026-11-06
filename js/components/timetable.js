// 10분 단위 타임테이블 (06시 ~ 다음 날 05시, 24행 × 6칸)
// 폰 조작:
//  - 칸 탭: 칠하기 / 같은 색이면 지우기
//  - 칸을 길게(0.4초) 누른 뒤 끌기: 여러 칸 연속 칠하기 (시작 칸이 칠해져 있으면 지우기). 그냥 끌면 화면 스크롤
//  - 시간 숫자 탭: 그 1시간(6칸) 한 번에
//  - "칠하기 모드" 켜면 길게 누르지 않고 바로 끌어서 칠하기
//  - 끄는 동안 손가락 위에 시각 말풍선, "되돌리기"로 방금 한 것 취소
// 태블릿·마우스: 바로 끌어서 칠하기
import * as store from '../store/index.js';
import { state, catHex } from '../state.js';
import { esc, safeColor, vibrate } from '../util/dom.js';
import { today } from '../util/date.js';
import { CELLS, hourOfRow, labelOf, endLabelOf, slotOf } from '../model/timetable.js';
import { icons } from './icons.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';

const pad = (n) => String(n).padStart(2, '0');

// 붓(칠할 카테고리) — 이 기기에서 기억
let brush = (() => {
  try {
    return localStorage.getItem('haru:brush') || null;
  } catch {
    return null;
  }
})();
let paintMode = false;
const undoStack = [];

function setBrush(id) {
  brush = id;
  try {
    localStorage.setItem('haru:brush', id);
  } catch {
    /* 무시 */
  }
}

function currentBrush() {
  const cats = state.categories.filter((c) => !c.archived);
  if (brush !== 'erase' && (!brush || !state.catMap[brush] || state.catMap[brush].archived)) brush = cats[0]?.id || 'erase';
  return brush;
}

export function timetableHTML({ date, cells = {}, wide = false }) {
  const b = currentBrush();
  const cats = state.categories.filter((c) => !c.archived);
  const nowIdx = date === today() ? slotOf(Date.now()).index : -1;
  let rows = '';
  for (let r = 0; r < 24; r++) {
    rows += `<div class="tt-row${r % 6 === 0 && r ? ' q' : ''}"><button type="button" class="tt-hour" data-hour="${r}" aria-label="${pad(hourOfRow(r))}시 한 시간 칠하기">${pad(hourOfRow(r))}</button>`;
    for (let c = 0; c < 6; c++) {
      const i = r * 6 + c;
      const cat = cells[i];
      rows += `<div class="tt-cell${cat ? ' on' : ''}${i === nowIdx ? ' now' : ''}" data-i="${i}"${cat ? ` style="--c:${catHex(cat)}"` : ''}></div>`;
    }
    rows += '</div>';
  }
  return `<div class="tt-tools">
      <div class="brushbar" role="radiogroup" aria-label="칠할 카테고리">${cats
        .map((c) => `<button type="button" class="chip" data-brush="${esc(c.id)}" aria-pressed="${b === c.id}"><i class="c" style="--c:${safeColor(c.color)}"></i>${esc(c.name)}</button>`)
        .join('')}<button type="button" class="chip" data-brush="erase" aria-pressed="${b === 'erase'}">⌫ 지우개</button></div>
      <div class="tt-actions">
        <button type="button" class="btn small ghost" data-act="tt-undo" ${undoStack.length ? '' : 'disabled'}>↶ 되돌리기</button>
        <button type="button" class="btn small ghost" data-act="tt-range">${icons.edit} 시간으로 입력</button>
        ${wide ? '' : `<button type="button" class="btn small ${paintMode ? 'primary' : 'ghost'}" data-act="tt-mode" aria-pressed="${paintMode}">✏ 칠하기 모드</button>`}
      </div>
    </div>
    <div class="tt-grid${paintMode ? ' paint' : ''}" data-tt>${rows}</div>
    <p class="hint tight">${wide ? '칸을 누르거나 끌어서 칠해요. 같은 색을 누르면 지워져요.' : '칸 탭: 칠하기·지우기 · 길게 누른 뒤 끌기: 여러 칸 · 시간 숫자 탭: 1시간'}</p>`;
}

function commit(date, pending, before) {
  if (!pending.size) return;
  const cells = {};
  for (const [i, v] of pending) cells[i] = v || store.DEL;
  store.patch('days', date, { date, cells });
  undoStack.push({ date, before: { ...before } });
  if (undoStack.length > 30) undoStack.shift();
}

// root: 플래너 화면 루트. ctx: { getDate, getCells, isWide, setBusy }
export function bindTimetable(root, ctx) {
  let press = null; // { i, mode, x, y, active, timer, pointerId }
  let pending = new Map(); // 칸 번호 → 새 카테고리(null = 지움)
  let before = {}; // 칸 번호 → 바꾸기 전 값
  let bubble = null;

  const cellEl = (i) => root.querySelector(`.tt-cell[data-i="${i}"]`);
  const valueOf = (i) => (pending.has(i) ? pending.get(i) : ctx.getCells()[i] || null);

  function paintDOM(i, cat) {
    const el = cellEl(i);
    if (!el) return;
    el.classList.toggle('on', !!cat);
    if (cat) el.style.setProperty('--c', catHex(cat));
    else el.style.removeProperty('--c');
  }

  function apply(i, mode) {
    const next = mode === 'erase' ? null : currentBrush();
    if (valueOf(i) === next) return;
    if (!(i in before)) before[i] = ctx.getCells()[i] || null;
    pending.set(i, next);
    paintDOM(i, next);
  }

  function showBubble(x, y, i) {
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'tt-bubble';
      document.body.appendChild(bubble);
    }
    bubble.textContent = `${labelOf(i)}–${endLabelOf(i)}`;
    bubble.style.left = x + 'px';
    bubble.style.top = y - 48 + 'px';
  }
  function hideBubble() {
    bubble?.remove();
    bubble = null;
  }

  function finish() {
    commit(ctx.getDate(), pending, before);
    pending = new Map();
    before = {};
    press = null;
    hideBubble();
    ctx.setBusy(false);
  }

  const modeFor = (i) => {
    const b = currentBrush();
    return b === 'erase' || (ctx.getCells()[i] || null) === b ? 'erase' : 'paint';
  };

  const onDown = (e) => {
    const el = e.target.closest('.tt-cell');
    if (!el || !root.contains(el) || (e.button && e.button !== 0)) return;
    const i = +el.dataset.i;
    const direct = e.pointerType === 'mouse' || e.pointerType === 'pen' || ctx.isWide() || paintMode;
    press = { i, mode: modeFor(i), x: e.clientX, y: e.clientY, active: false, pointerId: e.pointerId };
    ctx.setBusy(true);
    if (direct) {
      press.active = true;
      apply(i, press.mode);
      showBubble(e.clientX, e.clientY, i);
    } else {
      press.timer = setTimeout(() => {
        if (!press) return;
        press.active = true;
        vibrate(15);
        apply(press.i, press.mode);
        showBubble(press.x, press.y, press.i);
      }, 380);
    }
  };

  const onMove = (e) => {
    if (!press || e.pointerId !== press.pointerId) return;
    if (!press.active) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
        clearTimeout(press.timer); // 스크롤하려는 동작
        press = null;
        ctx.setBusy(false);
      }
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.tt-cell');
    if (el && root.contains(el)) {
      const i = +el.dataset.i;
      apply(i, press.mode);
      showBubble(e.clientX, e.clientY, i);
    }
  };

  const onUp = (e) => {
    if (!press || e.pointerId !== press.pointerId) return;
    clearTimeout(press.timer);
    if (!press.active && Math.hypot(e.clientX - press.x, e.clientY - press.y) <= 8) {
      apply(press.i, press.mode); // 짧게 탭
      vibrate(8);
    }
    finish();
  };

  const onCancel = () => {
    if (!press) return;
    clearTimeout(press.timer);
    if (press.active) finish();
    else {
      press = null;
      ctx.setBusy(false);
    }
  };

  // 길게 누른 뒤에는 화면이 스크롤되지 않게
  const onTouchMove = (e) => {
    if (press?.active && e.cancelable) e.preventDefault();
  };

  const onClick = (e) => {
    const bb = e.target.closest('[data-brush]');
    if (bb && root.contains(bb)) {
      setBrush(bb.dataset.brush);
      root.querySelectorAll('[data-brush]').forEach((x) => x.setAttribute('aria-pressed', String(x === bb)));
      return;
    }
    const hb = e.target.closest('[data-hour]');
    if (hb && root.contains(hb)) {
      const r = +hb.dataset.hour;
      const b = currentBrush();
      const idx = Array.from({ length: 6 }, (_, k) => r * 6 + k);
      const allSame = b !== 'erase' && idx.every((i) => (ctx.getCells()[i] || null) === b);
      const mode = b === 'erase' || allSame ? 'erase' : 'paint';
      idx.forEach((i) => apply(i, mode));
      vibrate(10);
      finish();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'tt-undo') {
      const u = undoStack.pop();
      if (!u) return;
      const cells = {};
      for (const [i, v] of Object.entries(u.before)) cells[i] = v || store.DEL;
      store.patch('days', u.date, { date: u.date, cells });
      toast('되돌렸어요');
    }
    if (act === 'tt-mode') {
      paintMode = !paintMode;
      ctx.rerender();
      toast(paintMode ? '칠하기 모드: 바로 끌어서 칠해요. 스크롤은 시간 숫자 쪽을 밀어 주세요' : '칠하기 모드를 껐어요');
    }
    if (act === 'tt-range') openRangeSheet(ctx);
  };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onCancel);
  root.addEventListener('touchmove', onTouchMove, { passive: false });
  root.addEventListener('click', onClick);
  const onContext = (e) => {
    if (e.target.closest('.tt-grid')) e.preventDefault(); // 길게 누를 때 뜨는 메뉴 막기
  };
  root.addEventListener('contextmenu', onContext);

  return () => {
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onCancel);
    root.removeEventListener('touchmove', onTouchMove);
    root.removeEventListener('click', onClick);
    root.removeEventListener('contextmenu', onContext);
    hideBubble();
  };
}

// "09:20 ~ 11:00"처럼 시간으로 정확히 칠하기
function openRangeSheet(ctx) {
  const cats = state.categories.filter((c) => !c.archived);
  let cat = currentBrush();
  const opts = (fromEnd) =>
    Array.from({ length: CELLS }, (_, i) => {
      const v = fromEnd ? i + 1 : i;
      const label = fromEnd ? endLabelOf(i) : labelOf(i);
      return `<option value="${v}">${label}${fromEnd && i >= 107 ? ' (다음 날)' : !fromEnd && i >= 108 ? ' (다음 날)' : ''}</option>`;
    }).join('');
  openSheet({
    title: '시간으로 입력',
    body: `<div class="form">
      <div class="field two">
        <label><span class="field-label">시작</span><select class="input" data-s>${opts(false)}</select></label>
        <label><span class="field-label">끝</span><select class="input" data-e>${opts(true)}</select></label>
      </div>
      <div class="field"><span class="field-label">카테고리</span><div class="chips" data-rc>${cats
        .map((c) => `<button type="button" class="chip" data-rcat="${esc(c.id)}" aria-pressed="${c.id === cat}"><i class="c" style="--c:${safeColor(c.color)}"></i>${esc(c.name)}</button>`)
        .join('')}<button type="button" class="chip" data-rcat="erase" aria-pressed="${cat === 'erase'}">⌫ 지우기</button></div></div>
    </div>`,
    footer: `<span class="spacer"></span><button type="button" class="btn ghost" data-close>취소</button><button type="button" class="btn primary" data-apply>적용</button>`,
    onMount(el, close) {
      const s = el.querySelector('[data-s]');
      const e = el.querySelector('[data-e]');
      s.value = '18'; // 09:00
      e.value = '24'; // 10:00
      el.querySelector('[data-rc]').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-rcat]');
        if (!b) return;
        cat = b.dataset.rcat;
        el.querySelectorAll('[data-rcat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      });
      el.querySelector('[data-apply]').addEventListener('click', () => {
        const a = +s.value;
        const z = +e.value;
        if (z <= a) return toast('끝 시각이 시작보다 늦어야 해요');
        const date = ctx.getDate();
        const old = ctx.getCells();
        const cells = {};
        const before = {};
        for (let i = a; i < z; i++) {
          before[i] = old[i] || null;
          cells[i] = cat === 'erase' ? store.DEL : cat;
        }
        store.patch('days', date, { date, cells });
        undoStack.push({ date, before });
        close();
        toast(`${labelOf(a)}–${endLabelOf(z - 1)} ${cat === 'erase' ? '지웠어요' : '칠했어요'}`);
      });
    },
  });
}
