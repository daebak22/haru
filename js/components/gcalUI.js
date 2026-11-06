// 구글 캘린더 일정 표시 (할 일과 구분되는 모양: 체크 박스 없음, 왼쪽 색 막대, 캘린더 아이콘)
import { state } from '../state.js';
import { esc, safeColor } from '../util/dom.js';
import { monthGrid, parse, fmtMonthDay, weekdayFull } from '../util/date.js';
import { gcal, eventsOn, refresh, refreshByUser, lastUpdatedLabel } from '../gcal.js';
import { icons } from './icons.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';

// 날짜가 들어 있는 달력 한 화면 범위
export function monthRangeOf(date) {
  const d = parse(date);
  const g = monthGrid(d.getFullYear(), d.getMonth(), state.settings.weekStart);
  return { from: g.days[0], to: g.days[g.days.length - 1] };
}

// 화면이 열릴 때: 연결된 상태면 조용히 최신 일정 불러오기 (아니면 보관된 일정 사용)
export function autoRefresh(from, to) {
  if (gcal.configured && gcal.linked) refresh(from, to);
}

const timeLabel = (ev) => (ev.allDay ? '종일' : ev.time ? (ev.endTime ? `${ev.time}–${ev.endTime}` : ev.time) : ev.endTime ? `~${ev.endTime}` : '계속');

function eventRowHTML(ev, date, i) {
  return `<div class="row gev" data-act="gev" data-date="${date}" data-i="${i}" role="button" tabindex="0">
    <span class="gev-bar" style="--c:${safeColor(ev.color)}"></span>
    <div class="row-body">
      <div class="row-title">${esc(ev.title)}</div>
      <div class="row-meta"><span class="gev-time">${esc(timeLabel(ev))}</span><span>${esc(ev.calName)}</span>${ev.location ? `<span class="memo">${esc(ev.location)}</span>` : ''}</div>
    </div>
    <span class="gev-icon" aria-hidden="true">${icons.calendar}</span>
  </div>`;
}

export function gcalSectionHTML(date) {
  if (!gcal.configured) return '';
  if (!gcal.linked) {
    return `<section class="section">
      <div class="gcal-hint">
        <span class="mi">${icons.calendar}</span>
        <span class="grow"><b>구글 캘린더 일정도 함께 볼까요?</b><small>읽기 전용으로만 연결돼요. 앱에서 구글 일정을 바꾸지 않아요.</small></span>
        <button type="button" class="btn small primary" data-act="gcal-refresh">연결</button>
      </div>
    </section>`;
  }
  const events = eventsOn(date);
  const st = gcal.status;
  const note =
    st === 'expired'
      ? `<div class="gcal-note"><span>연결 시간이 지났어요${gcal.fetchedAt ? ` · ${lastUpdatedLabel()}` : ''}</span><button type="button" class="btn small soft" data-act="gcal-refresh">다시 불러오기</button></div>`
      : st === 'error'
        ? `<div class="gcal-note"><span>${esc(gcal.error || '불러오지 못했어요')}</span><button type="button" class="btn small soft" data-act="gcal-refresh">다시 시도</button></div>`
        : '';
  return `<section class="section">
    <h2 class="section-title">
      <span>구글 캘린더${events.length ? `<span class="count">${events.length}</span>` : ''}</span>
      <span class="sec-tools">${st === 'loading' ? '<small class="muted">불러오는 중…</small>' : gcal.fetchedAt && st !== 'expired' ? `<small class="muted">${lastUpdatedLabel()}</small>` : ''}
        <button type="button" class="icon-btn sm${st === 'loading' ? ' spin' : ''}" data-act="gcal-refresh" aria-label="구글 캘린더 새로고침">${icons.refresh}</button></span>
    </h2>
    ${note}
    <div class="list gcal-list">${events.length ? events.map((ev, i) => eventRowHTML(ev, date, i)).join('') : '<p class="empty small">이 날은 구글 일정이 없어요.</p>'}</div>
  </section>`;
}

function openEventSheet(ev, date) {
  const rows = [
    `<div class="ev-detail-row">${icons.calendar}<span>${fmtMonthDay(date)} ${weekdayFull(date)} · ${esc(timeLabel(ev))}</span></div>`,
    `<div class="ev-detail-row"><i class="ev-dot" style="--c:${safeColor(ev.color)}"></i><span>${esc(ev.calName)}</span></div>`,
    ev.location ? `<div class="ev-detail-row">${icons.pin}<span>${esc(ev.location)}</span></div>` : '',
  ].join('');
  openSheet({
    title: ev.title,
    body: `<div class="ev-detail">${rows}<p class="hint">구글 캘린더 일정은 이 앱에서 읽기만 해요. 고치거나 지우려면 구글 캘린더에서 해 주세요.</p></div>`,
    footer: ev.link
      ? `<a class="btn primary" style="flex:1" href="${esc(ev.link)}" target="_blank" rel="noopener">${icons.external} 구글 캘린더에서 열기</a>`
      : '',
  });
}

// 클릭 처리: 처리했으면 true
export function handleGcalClick(el, date) {
  const act = el.dataset.act;
  if (act === 'gcal-refresh') {
    const range = monthRangeOf(date);
    refreshByUser(range.from, range.to).then((err) => err && toast(err));
    return true;
  }
  if (act === 'gev') {
    const d = el.dataset.date;
    const ev = eventsOn(d)[Number(el.dataset.i)];
    if (ev) openEventSheet(ev, d);
    return true;
  }
  return false;
}
