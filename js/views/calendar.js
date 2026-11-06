// 월간 달력 (구글 캘린더처럼 칸 안에 할 일 이름을 색 막대로 표시)
// 폰: 달력이 화면을 가득 채우고, 날짜를 누르면 아래에서 그날 목록이 올라옴
// 태블릿 가로: 왼쪽 달력 + 오른쪽 그날 목록
import * as store from '../store/index.js';
import { state, onState, catHex } from '../state.js';
import { today, addDays, parse, ymd, monthGrid, weekdayOrder, weekdayName, fmtMonthDay, weekdayFull, relLabel } from '../util/date.js';
import { isWide } from '../util/layout.js';
import { esc, frame, setHTML, readableOn, safeColor } from '../util/dom.js';
import { onGcal, eventsOn } from '../gcal.js';
import { autoRefresh } from '../components/gcalUI.js';
import { projectsOn } from '../model/project.js';
import { occursOn } from '../model/routine.js';
import { icons } from '../components/icons.js';
import { sortTasks } from '../components/rows.js';
import { openSheet } from '../components/sheet.js';
import { dayPanelHTML, bindDayPanel } from '../components/dayPanel.js';

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// 다른 화면에 다녀와도 보던 달을 기억
let viewY;
let viewM;
let selected;

function setView(dateStr) {
  const d = parse(dateStr);
  viewY = d.getFullYear();
  viewM = d.getMonth();
}

export function mount(root, opts = {}) {
  const t = today();
  if (opts.selectToday || !selected) {
    selected = t;
    setView(t);
  }
  const wide = isWide();
  if (!wide) root.classList.add('fit');
  let tasks = [];
  let days = {};
  let unsubT = null;
  let unsubD = null;
  let rangeKey = '';
  let daySheet = null; // 폰에서 열린 날짜 시트 { date, body, close }

  // 보이는 달력 칸 범위만 구독 (오늘이 보이면 지난 미완료 확인용으로 14일 더)
  function subscribe() {
    const g = monthGrid(viewY, viewM, state.settings.weekStart);
    const from = g.days[0];
    const to = g.days[g.days.length - 1];
    const qFrom = t >= from && t <= to && addDays(t, -14) < from ? addDays(t, -14) : from;
    const key = qFrom + to;
    if (key === rangeKey) return;
    autoRefresh(from, to);
    rangeKey = key;
    unsubT?.();
    unsubD?.();
    unsubT = store.watch('tasks', { field: 'date', gte: qFrom, lte: to }, (d) => {
      tasks = d;
      render();
    });
    unsubD = store.watch('days', { field: 'date', gte: from, lte: to }, (d) => {
      days = Object.fromEntries(d.map((x) => [x.id, x]));
      render();
    });
  }

  function evHTML(x) {
    const hex = catHex(x.categoryId);
    const done = x.done ? ' done' : '';
    if (x.time) {
      return `<span class="ev timed${done}" style="--c:${hex}"><i></i>${wide ? `<span class="t">${esc(x.time)}</span>` : ''}${esc(x.title)}</span>`;
    }
    return `<span class="ev${done}" style="--c:${hex};--on:${readableOn(hex)}">${esc(x.title)}</span>`;
  }

  // 구글 일정: 테두리만 있는 막대 (할 일은 색을 채운 막대)
  function gevHTML(ev) {
    const c = safeColor(ev.color);
    if (!ev.allDay && ev.time) {
      return `<span class="ev g timed" style="--c:${c}"><i></i>${wide ? `<span class="t">${esc(ev.time)}</span>` : ''}${esc(ev.title)}</span>`;
    }
    return `<span class="ev g" style="--c:${c}">${esc(ev.title)}</span>`;
  }

  // 프로젝트 기간 막대: 시작일·주의 첫 칸에만 이름, 칸 사이는 이어지게
  function pbarHTML(p, d, weekStart) {
    const s = d === p.startDate;
    const e = d === p.endDate;
    return `<span class="ev p${s ? ' s' : ''}${e ? ' e' : ''}" style="--c:${safeColor(p.color)}">${s || weekStart ? esc(p.name) : '&nbsp;'}</span>`;
  }

  function cellHTML(d, list, dayDoc, maxEv, weekStart) {
    const date = parse(d);
    const cls = ['cal-cell', date.getMonth() !== viewM && 'out', d === t && 'is-today', d === selected && 'selected']
      .filter(Boolean)
      .join(' ');
    const items = [
      ...projectsOn(state.projects, d).slice(0, 2).map((p) => ({ p })),
      ...eventsOn(d).map((ev) => ({ g: ev })),
      ...sortTasks(list),
    ];
    const shown = items.length > maxEv ? items.slice(0, Math.max(0, maxEv - 1)) : items;
    const more = items.length - shown.length;
    let ok = '';
    if (d <= t) {
      const skip = dayDoc?.routineSkip || {};
      const rdone = dayDoc?.routineDone || {};
      const rs = state.routines.filter((r) => occursOn(r, d) && !skip[r.id]);
      const total = list.length + rs.length;
      const n = list.filter((x) => x.done).length + rs.filter((r) => rdone[r.id]).length;
      if (total && n === total) ok = '<span class="ok" title="모두 완료">✓</span>';
    }
    return `<button type="button" class="${cls}" data-act="cal-pick" data-date="${d}" aria-label="${date.getMonth() + 1}월 ${date.getDate()}일, 할 일 ${list.length}개">
      <span class="top"><span class="num">${date.getDate()}</span>${ok}</span>
      <span class="evs">${shown.map((x) => (x.p ? pbarHTML(x.p, d, weekStart) : x.g ? gevHTML(x.g) : evHTML(x))).join('')}${more ? `<span class="ev-more">+${more}</span>` : ''}</span>
    </button>`;
  }

  // 칸 높이에 들어가는 일정 줄 수 계산 (그린 뒤 실제 칸 높이를 재서 맞춤)
  let cellH = 0;
  function maxEvents(rows) {
    const h = cellH || (window.innerHeight - (wide ? 122 : 176)) / rows;
    return wide ? Math.max(1, Math.floor((h - 36) / 22)) : Math.max(1, Math.floor((h - 32) / 19));
  }
  function measure() {
    const h = root.querySelector('.cal-cell')?.clientHeight || 0;
    if (h && Math.abs(h - cellH) > 2) {
      cellH = h;
      render();
    }
  }

  const render = frame(() => {
    const g = monthGrid(viewY, viewM, state.settings.weekStart);
    const rows = g.days.length / 7;
    const maxEv = maxEvents(rows);
    const byDate = {};
    for (const x of tasks) if (x.date) (byDate[x.date] ||= []).push(x);
    const cal = `
      <div class="cal-wrap">
        <div class="cal-head">
          <h1 class="cal-title"><b>${viewM + 1}</b>월<small>${viewY} · ${MONTHS_EN[viewM]}</small></h1>
          <button type="button" class="btn small soft" data-act="cal-today">오늘</button>
          <button type="button" class="icon-btn" data-act="cal-prev" aria-label="이전 달">${icons.left}</button>
          <button type="button" class="icon-btn" data-act="cal-next" aria-label="다음 달">${icons.right}</button>
        </div>
        <div class="cal">
          <div class="cal-week">${weekdayOrder(state.settings.weekStart)
            .map((i) => `<span class="${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${weekdayName(i)}</span>`)
            .join('')}</div>
          <div class="cal-grid" style="--rows:${rows}">${g.days.map((d, k) => cellHTML(d, byDate[d] || [], days[d], maxEv, k % 7 === 0)).join('')}</div>
        </div>
      </div>`;
    const fab = `<button type="button" class="fab" data-act="add" aria-label="할 일 추가">${icons.plus}</button>`;
    if (wide) {
      const panel = dayPanelHTML({ date: selected, tasks, dayDoc: days[selected] });
      setHTML(root, `<div class="split"><section class="pane cal-pane">${cal}</section><section class="pane" data-scroll="day">${panel}</section></div>${fab}`);
    } else {
      setHTML(root, cal + fab);
      if (daySheet) setHTML(daySheet.body, dayPanelHTML({ date: daySheet.date, tasks, dayDoc: days[daySheet.date], compact: true }));
    }
    measure();
  });

  function openDaySheet(date) {
    const rel = relLabel(date);
    openSheet({
      title: `${fmtMonthDay(date)} ${weekdayFull(date)}${rel ? ` · ${rel}` : ''}`,
      body: dayPanelHTML({ date, tasks, dayDoc: days[date], compact: true }),
      bodyClass: 'day-body',
      footer: `<button type="button" class="btn primary" data-act="add" style="flex:1">${icons.plus} 이 날에 할 일 추가</button>`,
      onMount(el, close) {
        const unbind = bindDayPanel(el, () => ({ date, tasks, dayDoc: days[date] }));
        daySheet = { date, body: el.querySelector('.sheet-body'), close, unbind };
      },
      onClose() {
        daySheet?.unbind();
        daySheet = null;
      },
    });
  }

  function shiftMonth(n) {
    let m = viewM + n;
    let y = viewY;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    viewY = y;
    viewM = m;
    const tp = parse(t);
    selected = tp.getFullYear() === y && tp.getMonth() === m ? t : ymd(new Date(y, m, 1));
    subscribe();
    render();
  }

  let suppressClick = false;
  const onClick = (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    switch (el.dataset.act) {
      case 'cal-prev':
        shiftMonth(-1);
        break;
      case 'cal-next':
        shiftMonth(1);
        break;
      case 'cal-today':
        selected = t;
        setView(t);
        subscribe();
        render();
        break;
      case 'cal-pick': {
        selected = el.dataset.date;
        const p = parse(selected);
        if (p.getMonth() !== viewM || p.getFullYear() !== viewY) {
          setView(selected);
          subscribe();
        }
        render();
        if (!wide) openDaySheet(selected);
        break;
      }
    }
  };

  // 달력을 좌우로 밀어서 달 바꾸기
  let sx = null;
  let sy = null;
  const onDown = (e) => {
    if (!e.target.closest('.cal-grid')) return;
    sx = e.clientX;
    sy = e.clientY;
  };
  const onUp = (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 350);
      shiftMonth(dx < 0 ? 1 : -1);
    }
  };
  const onCancel = () => (sx = null);
  const onResize = () => {
    cellH = 0;
    render();
  };

  root.addEventListener('click', onClick);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onCancel);
  window.addEventListener('resize', onResize);
  const unbindPanel = bindDayPanel(root, () => ({ date: selected, tasks, dayDoc: days[selected] }));
  let lastWeekStart = state.settings.weekStart;
  const unState = onState(() => {
    if (state.settings.weekStart !== lastWeekStart) {
      lastWeekStart = state.settings.weekStart;
      subscribe();
    }
    render();
  });

  const unGcal = onGcal(render);
  subscribe();
  render();
  return () => {
    unGcal();
    daySheet?.close();
    root.classList.remove('fit');
    root.removeEventListener('click', onClick);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('resize', onResize);
    unbindPanel();
    unState();
    unsubT?.();
    unsubD?.();
  };
}
