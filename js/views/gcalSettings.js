// 더보기 → 구글 캘린더: 연결, 표시할 캘린더 고르기, 새로고침, 연결 해제
import { state, onState, updateSettings } from '../state.js';
import { today } from '../util/date.js';
import { esc, frame, setHTML, safeColor } from '../util/dom.js';
import { gcal, onGcal, selectedIds, refreshByUser, refresh, disconnect, lastUpdatedLabel } from '../gcal.js';
import { icons } from '../components/icons.js';
import { confirmBox } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { monthRangeOf } from '../components/gcalUI.js';

export function mount(root) {
  const range = monthRangeOf(today());

  const render = frame(() => {
    let body;
    if (!gcal.configured) {
      body = `<div class="list soon">
        <div class="soon-icon">${icons.calendar}</div>
        <p><b>연결 준비 중이에요</b></p>
        <p class="hint">구글 클라우드 콘솔에서 만든 "클라이언트 ID"를 앱에 넣으면 연결할 수 있어요. (Claude가 안내해 드려요)</p>
      </div>`;
    } else if (!gcal.linked) {
      body = `<div class="list soon">
        <div class="soon-icon">${icons.calendar}</div>
        <p><b>구글 캘린더 일정을 함께 보기</b></p>
        <p class="hint">"캘린더 보기" 권한만 요청해요. 이 앱에서 구글 일정을 고치거나 지울 수 없어요.</p>
        <button type="button" class="btn primary" data-act="connect">${icons.calendar} 구글 계정으로 연결</button>
      </div>`;
    } else {
      const ids = new Set(selectedIds());
      const cals = gcal.calendars
        .map(
          (c) => `<label class="setting cal-pick">
            <span class="cal-name"><i class="ev-dot" style="--c:${safeColor(c.color)}"></i>${esc(c.name)}${c.primary ? ' <small class="muted">(기본)</small>' : ''}</span>
            <input type="checkbox" class="switch" data-cal="${esc(c.id)}" ${ids.has(c.id) ? 'checked' : ''}>
          </label>`
        )
        .join('');
      const status =
        gcal.status === 'loading'
          ? '불러오는 중…'
          : gcal.status === 'expired'
            ? `연결 시간이 지났어요 (약 1시간마다) · 새로고침을 눌러 주세요`
            : gcal.status === 'error'
              ? esc(gcal.error)
              : gcal.fetchedAt
                ? `마지막 업데이트: ${lastUpdatedLabel()}`
                : '새로고침을 눌러 일정을 불러오세요';
      body = `
        <div class="list">
          <div class="setting"><span>상태<br><small class="muted">${status}</small></span>
            <button type="button" class="btn small soft" data-act="refresh">${icons.refresh} 새로고침</button></div>
        </div>
        <h2 class="section-title"><span>표시할 캘린더</span></h2>
        <div class="list">${cals || '<p class="empty">새로고침을 누르면 내 캘린더 목록이 나와요.</p>'}</div>
        <p class="hint">개인 캘린더, 공유받은 캘린더 중 보고 싶은 것만 켜 두세요. 이 선택은 앱 안에서만 쓰이고 구글 캘린더 설정은 바뀌지 않아요.</p>
        <div class="list">
          <button type="button" class="menu-item danger" data-act="disconnect"><span class="mi">${icons.x}</span><span class="grow">연결 해제<small>이 기기에 보관한 구글 일정도 지워요</small></span></button>
        </div>`;
    }
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="gcal">
        <header class="page-head">
          <a class="icon-btn" href="#more" aria-label="뒤로">${icons.left}</a>
          <h1>구글 캘린더</h1>
        </header>
        <p class="hint">약속·공유 일정은 구글 캘린더에서 관리하고, 여기서는 읽기만 해요. 일정은 오늘 화면과 달력에 <b>테두리 막대</b>로 표시돼요.</p>
        ${body}
      </div>`
    );
  });

  const onClick = async (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const act = el.dataset.act;
    if (act === 'connect' || act === 'refresh') {
      const err = await refreshByUser(range.from, range.to);
      toast(err || '구글 캘린더 일정을 불러왔어요');
    }
    if (act === 'disconnect') {
      const ok = await confirmBox('구글 캘린더 연결을 해제할까요? 다시 연결하면 언제든 볼 수 있어요.', { ok: '연결 해제', danger: true });
      if (ok) {
        disconnect();
        updateSettings({ gcalCalendars: null });
        toast('연결을 해제했어요');
      }
    }
  };
  const onChange = (e) => {
    const box = e.target.closest('[data-cal]');
    if (!box) return;
    const ids = new Set(selectedIds());
    box.checked ? ids.add(box.dataset.cal) : ids.delete(box.dataset.cal);
    updateSettings({ gcalCalendars: [...ids] });
    setTimeout(() => refresh(range.from, range.to), 50); // 토큰이 살아 있으면 바로 다시 불러옴
  };
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  const unState = onState(render);
  const unGcal = onGcal(render);
  render();
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    unState();
    unGcal();
  };
}
