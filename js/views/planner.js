// 데일리 플래너: 날짜 · D-Day · 총 기록 시간 · 타이머 · 체크리스트 · 타임테이블 · 구글 일정 · 타이머 기록
// 폰: 위에서 아래로 한 줄. 태블릿 가로: 왼쪽(기록·체크리스트) + 오른쪽(타임테이블 전체)
import * as store from '../store/index.js';
import { state, onState, catHex } from '../state.js';
import { today, addDays, fmtMonthDay, weekdayFull, relLabel } from '../util/date.js';
import { isWide } from '../util/layout.js';
import { esc, frame, setHTML } from '../util/dom.js';
import { totals, fmtMin, hhmmOf, cellsForRange } from '../model/timetable.js';
import { icons } from '../components/icons.js';
import { openMenu } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { dayPanelHTML, bindDayPanel } from '../components/dayPanel.js';
import { gcalSectionHTML, monthRangeOf, autoRefresh } from '../components/gcalUI.js';
import { onGcal } from '../gcal.js';
import { timerCardHTML, handleTimerClick } from '../components/timerUI.js';
import { ddayChipsHTML, openDdaySheet } from '../components/dday.js';
import { timetableHTML, bindTimetable } from '../components/timetable.js';

let pDate = null; // 보고 있는 날짜 (다른 화면에 다녀와도 기억)

const catName = (id) => state.catMap[id]?.name || '분류 없음';

function totalsHTML(cells) {
  const { total, by } = totals(cells);
  const list = Object.entries(by).sort((a, b) => b[1] - a[1]);
  return `<div class="totals">
    <div class="tt-total"><span><i class="label-en">TOTAL</i>오늘 기록한 시간</span><b>${total ? fmtMin(total) : '0분'}</b></div>
    ${
      total
        ? `<div class="tt-bar">${list.map(([c, m]) => `<i style="--c:${catHex(c)};width:${(m / total) * 100}%"></i>`).join('')}</div>
           <div class="tt-cats">${list.map(([c, m]) => `<span><i style="--c:${catHex(c)}"></i>${esc(catName(c))} <b>${fmtMin(m)}</b></span>`).join('')}</div>`
        : '<p class="hint tight">타이머를 쓰거나 타임테이블 칸을 칠하면 자동으로 더해져요.</p>'
    }
  </div>`;
}

function sessionsHTML(dayDoc, tasks) {
  const list = Object.entries(dayDoc?.sessions || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.start - b.start);
  if (!list.length) return '';
  return `<section class="section">
    <h2 class="section-title"><span><i class="en">TIMER LOG</i>타이머 기록<span class="count">${list.length}</span></span></h2>
    <div class="list">${list
      .map((s) => {
        const task = tasks.find((x) => x.id === s.taskId);
        return `<div class="row" data-sid="${esc(s.id)}">
          <span class="gev-bar" style="--c:${catHex(s.categoryId)}"></span>
          <div class="row-body" data-act="session"><div class="row-title">${hhmmOf(s.start)} – ${hhmmOf(s.end)} <span class="muted">· ${fmtMin(Math.round((s.end - s.start) / 60000))}</span></div>
            <div class="row-meta"><span class="tag" style="--c:${catHex(s.categoryId)}">${esc(catName(s.categoryId))}</span>${task ? `<span>${esc(task.title)}</span>` : ''}</div></div>
          <button type="button" class="icon-btn" data-act="session" aria-label="기록 메뉴">${icons.dots}</button>
        </div>`;
      })
      .join('')}</div>
  </section>`;
}

export function mount(root) {
  const t = today();
  if (!pDate) pDate = t;
  const wide = isWide();
  let tasks = [];
  let dayDoc = null;
  let unsubT = null;
  let unsubD = null;
  let busy = false; // 타임테이블을 칠하는 중이면 화면을 다시 그리지 않음
  let needRender = false;

  function subscribe() {
    unsubT?.();
    unsubD?.();
    unsubT = store.watch('tasks', { field: 'date', eq: pDate }, (d) => {
      tasks = d;
      render();
    });
    unsubD = store.watchDoc('days', pDate, (d) => {
      dayDoc = d;
      render();
    });
    const r = monthRangeOf(pDate);
    autoRefresh(r.from, r.to);
  }

  const draw = frame(() => {
    if (busy) {
      needRender = true;
      return;
    }
    const rel = relLabel(pDate);
    const relEn = { 오늘: 'TODAY', 내일: 'TOMORROW', 어제: 'YESTERDAY' }[rel];
    const head = `<div class="planner-head">
        <button type="button" class="icon-btn" data-act="p-prev" aria-label="전날">${icons.left}</button>
        <div class="p-date">
          <div class="day-rel">${relEn || 'DAILY PLANNER'}</div>
          <h1 class="day-title">${fmtMonthDay(pDate)}<span class="wd">${weekdayFull(pDate)}</span></h1>
        </div>
        <button type="button" class="icon-btn" data-act="p-next" aria-label="다음 날">${icons.right}</button>
      </div>
      ${pDate !== t ? '<div class="center"><button type="button" class="btn small soft" data-act="p-today">오늘로</button></div>' : ''}
      ${ddayChipsHTML({ manage: true })}`;
    const cells = dayDoc?.cells || {};
    const left = `${head}
      ${totalsHTML(cells)}
      ${pDate === t || state.settings.timer ? timerCardHTML(tasks) : ''}
      <div class="checklist">${dayPanelHTML({ date: pDate, tasks, dayDoc, compact: true, gcal: false })}</div>
      ${gcalSectionHTML(pDate)}
      ${sessionsHTML(dayDoc, tasks)}`;
    const tt = `<section class="section tt-sec">
        <h2 class="section-title"><span><i class="en">TIME TABLE</i>타임테이블</span></h2>
        ${timetableHTML({ date: pDate, cells, wide })}
      </section>`;
    const fab = `<button type="button" class="fab" data-act="add" aria-label="할 일 추가">${icons.plus}</button>`;
    setHTML(
      root,
      wide
        ? `<div class="split planner-split"><section class="pane" data-scroll="pl-left">${left}</section><section class="pane tt-pane" data-scroll="pl-tt">${tt}</section></div>${fab}`
        : `<div class="page-scroll planner">${left}${tt}</div>${fab}`
    );
  });
  const render = () => draw();

  const go = (d) => {
    pDate = d;
    subscribe();
    render();
  };

  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-tcat]');
    if (!el || !root.contains(el)) return;
    if (handleTimerClick(el, root)) return;
    switch (el.dataset.act) {
      case 'p-prev':
        go(addDays(pDate, -1));
        break;
      case 'p-next':
        go(addDays(pDate, 1));
        break;
      case 'p-today':
        go(today());
        break;
      case 'dday-manage':
        openDdaySheet();
        break;
      case 'session': {
        const sid = el.closest('[data-sid]')?.dataset.sid;
        const s = dayDoc?.sessions?.[sid];
        if (!s) break;
        const date = pDate;
        openMenu(`${hhmmOf(s.start)} – ${hhmmOf(s.end)} 기록`, [
          {
            label: '기록과 칠한 칸 함께 지우기',
            icon: 'trash',
            danger: true,
            onClick: () => {
              const idx = cellsForRange(s.start, s.end)[date] || [];
              const cur = dayDoc?.cells || {};
              const cells = {};
              idx.forEach((i) => {
                if (cur[i] === (s.categoryId || '_')) cells[i] = store.DEL;
              });
              store.patch('days', date, { date, sessions: { [sid]: store.DEL }, cells });
              toast('기록을 지웠어요', { action: '되돌리기', onAction: () => store.patch('days', date, { date, sessions: { [sid]: s }, cells: Object.fromEntries(Object.keys(cells).map((i) => [i, cur[i]])) }) });
            },
          },
          {
            label: '기록만 지우기 (칸은 그대로)',
            icon: 'trash',
            onClick: () => {
              store.patch('days', date, { date, sessions: { [sid]: store.DEL } });
              toast('기록을 지웠어요', { action: '되돌리기', onAction: () => store.patch('days', date, { date, sessions: { [sid]: s } }) });
            },
          },
        ]);
        break;
      }
    }
  };

  root.addEventListener('click', onClick);
  const unbindPanel = bindDayPanel(root, () => ({ date: pDate, tasks, dayDoc }));
  const unbindTT = bindTimetable(root, {
    getDate: () => pDate,
    getCells: () => dayDoc?.cells || {},
    isWide: () => wide,
    rerender: render,
    setBusy: (v) => {
      busy = v;
      if (!v && needRender) {
        needRender = false;
        render();
      }
    },
  });
  const unState = onState(render);
  const unGcal = onGcal(render);
  // 지금 시각 표시(칸 테두리)를 몇 분마다 옮김
  const nowTimer = setInterval(() => pDate === today() && render(), 5 * 60 * 1000);

  subscribe();
  render();
  return () => {
    root.removeEventListener('click', onClick);
    unbindPanel();
    unbindTT();
    unState();
    unGcal();
    clearInterval(nowTimer);
    unsubT?.();
    unsubD?.();
  };
}
