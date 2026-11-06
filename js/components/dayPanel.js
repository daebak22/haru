// 하루 목록 (오늘 화면, 달력에서 고른 날짜에 공통 사용)
import { state } from '../state.js';
import { today, fmtMonthDay, weekdayFull, relLabel } from '../util/date.js';
import { occursOn, sortRoutines } from '../model/routine.js';
import { sortTasks, taskRowHTML, routineRowHTML } from './rows.js';
import { toggleTask, openTaskMenu, toggleRoutine, openRoutineMenu, moveOverdueToToday } from './taskActions.js';
import { openTaskEditor } from './taskEditor.js';
import { QUOTES, quoteIndexFor } from '../model/quotes.js';
import { TERMS, termIndexFor } from '../model/terms.js';
import { quoteCardHTML, termCardHTML, toggleFavorite } from './quoteCard.js';
import { gcalSectionHTML, handleGcalClick } from './gcalUI.js';

function overdueOf(tasks, date) {
  const t = today();
  if (date !== t) return [];
  return tasks.filter((x) => x.date && x.date < t && !x.done).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function ringHTML(done, total) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 0;
  return `<div class="ring${total && done === total ? ' full' : ''}" role="img" aria-label="완료 ${done}개, 전체 ${total}개">
    <svg viewBox="0 0 58 58" aria-hidden="true">
      <circle class="track" cx="29" cy="29" r="${r}" fill="none" stroke-width="6"/>
      <circle class="val" cx="29" cy="29" r="${r}" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}" ${p ? '' : 'opacity="0"'}/>
    </svg>
    <span>${total ? (done === total ? '완료' : `${done}/${total}`) : '-'}</span>
  </div>`;
}

// 오늘의 한 문장 (누르면 다른 문장으로 바뀜. 바꾼 순서는 앱을 켜 둔 동안만 유지)
let quoteShift = 0;
function quoteHTML(date) {
  const q = QUOTES[(quoteIndexFor(date) + quoteShift) % QUOTES.length];
  return quoteCardHTML(q, { nextable: true });
}

// 오늘의 부동산금융 용어 (누르면 다음 용어)
let termShift = 0;
function termHTML(date) {
  const t = TERMS[(termIndexFor(date) + termShift) % TERMS.length];
  return termCardHTML(t, { home: true });
}

// compact: 시트 안에서 쓸 때 (날짜 제목은 시트 머리에 있으므로 진행 막대만)
export function dayPanelHTML({ date, tasks, dayDoc, compact = false }) {
  const dayTasks = sortTasks(tasks.filter((x) => x.date === date));
  const overdue = overdueOf(tasks, date);
  const skip = dayDoc?.routineSkip || {};
  const rdone = dayDoc?.routineDone || {};
  const routines = sortRoutines(state.routines.filter((r) => occursOn(r, date)));
  const counted = routines.filter((r) => !skip[r.id]);
  const total = dayTasks.length + counted.length;
  const done = dayTasks.filter((x) => x.done).length + counted.filter((r) => rdone[r.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const rel = relLabel(date);

  const head = compact
    ? `<div class="day-sum">${rel ? `<b class="day-rel">${rel}</b>` : ''}<span>${total ? `${done} / ${total} 완료` : '계획 없음'}</span><div class="bar"><i style="width:${pct}%"></i></div></div>`
    : `<div class="day-head">
        <div>
          <div class="day-rel">${{ 오늘: 'TODAY', 내일: 'TOMORROW', 어제: 'YESTERDAY' }[rel] || weekdayFull(date)}</div>
          <h1 class="day-title">${fmtMonthDay(date)}${rel ? `<span class="wd">${weekdayFull(date)}</span>` : ''}</h1>
        </div>
        ${ringHTML(done, total)}
      </div>`;

  const overdueHTML = overdue.length
    ? `<section class="section warn">
        <h2 class="section-title"><span><i class="en">OVERDUE</i>지난 미완료<span class="count">${overdue.length}</span></span><button type="button" class="btn small soft" data-act="overdue-all">모두 오늘로</button></h2>
        <div class="list">${overdue.map((x) => taskRowHTML(x, { showDate: true })).join('')}</div>
      </section>`
    : '';

  const tasksHTML = `<section class="section">
      <h2 class="section-title"><span><i class="en">TO DO</i>할 일${dayTasks.length ? `<span class="count">${dayTasks.filter((x) => x.done).length}/${dayTasks.length}</span>` : ''}</span></h2>
      <div class="list">${
        dayTasks.length
          ? dayTasks.map((x) => taskRowHTML(x)).join('')
          : `<p class="empty">아직 할 일이 없어요.<br><b>+</b> 버튼을 눌러 추가해 보세요.</p>`
      }</div>
    </section>`;

  const routinesHTML = routines.length
    ? `<section class="section">
        <h2 class="section-title"><span><i class="en">ROUTINE</i>루틴<span class="count">${counted.filter((r) => rdone[r.id]).length}/${counted.length}</span></span></h2>
        <div class="list">${routines.map((r) => routineRowHTML(r, { done: !!rdone[r.id], skipped: !!skip[r.id] })).join('')}</div>
      </section>`
    : '';

  const isTodayHome = !compact && rel === '오늘';
  const quote = isTodayHome && state.settings.showQuote !== false ? quoteHTML(date) : '';
  const term = isTodayHome && state.settings.showTerm !== false ? termHTML(date) : '';
  // 순서: 머리 → 한 문장 → 구글 일정 → 지난 미완료 → 할 일 → 루틴 → 오늘의 용어
  return head + quote + gcalSectionHTML(date) + overdueHTML + tasksHTML + routinesHTML + term;
}

// getCtx: () => ({ date, tasks, dayDoc }) — 클릭한 순간의 최신 데이터
export function bindDayPanel(root, getCtx) {
  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const { date, tasks, dayDoc } = getCtx();
    const taskOf = () => tasks.find((x) => x.id === el.closest('[data-id]')?.dataset.id);
    const routineOf = () => state.routines.find((r) => r.id === el.closest('[data-rid]')?.dataset.rid);
    switch (el.dataset.act) {
      case 'toggle': {
        const tk = taskOf();
        if (tk) toggleTask(tk);
        break;
      }
      case 'edit': {
        const tk = taskOf();
        if (tk) openTaskEditor({ task: tk });
        break;
      }
      case 'menu': {
        const tk = taskOf();
        if (tk) openTaskMenu(tk);
        break;
      }
      case 'rtoggle': {
        const r = routineOf();
        if (r) toggleRoutine(r.id, date, dayDoc);
        break;
      }
      case 'rmenu': {
        const r = routineOf();
        if (r) openRoutineMenu(r, date, dayDoc);
        break;
      }
      case 'add':
        openTaskEditor({ date });
        break;
      case 'overdue-all':
        moveOverdueToToday(overdueOf(tasks, date));
        break;
      case 'quote-next': {
        quoteShift = (quoteShift + 1) % QUOTES.length;
        el.closest('.quote').outerHTML = quoteHTML(date);
        root.querySelector('.quote')?.classList.add('pop');
        break;
      }
      case 'term-next': {
        termShift = (termShift + 1) % TERMS.length;
        el.closest('.term').outerHTML = termHTML(date);
        root.querySelector('.term')?.classList.add('pop');
        break;
      }
      case 'fav':
        toggleFavorite(el.dataset.kind, el.dataset.fid);
        break;
      default:
        handleGcalClick(el, date);
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
