// 타이머 카드(플래너), 타이머 띠(오늘 화면), 정지·취소 처리
import { state, catHex } from '../state.js';
import { esc, safeColor } from '../util/dom.js';
import { fmtClock, fmtMin, hhmmOf } from '../model/timetable.js';
import { running, elapsedMs, startTimer, stopTimer, cancelTimer } from '../timer.js';
import { icons } from './icons.js';
import { openSheet, confirmBox } from './sheet.js';
import { toast } from './toast.js';

// 이 기기에서 마지막으로 고른 타이머 카테고리
let timerCat = (() => {
  try {
    return localStorage.getItem('haru:timerCat') || null;
  } catch {
    return null;
  }
})();
function setTimerCat(id) {
  timerCat = id;
  try {
    localStorage.setItem('haru:timerCat', id);
  } catch {
    /* 무시 */
  }
}

const catName = (id) => state.catMap[id]?.name || '분류 없음';

export function timerCardHTML(tasks = []) {
  const t = running();
  if (t) {
    const task = tasks.find((x) => x.id === t.taskId);
    return `<div class="timer running" style="--c:${catHex(t.categoryId)}">
      <div class="timer-top"><span class="label-en">TIMER</span><span class="rec"><i></i>기록 중 · ${hhmmOf(t.startedAt)} 시작</span></div>
      <div class="clock" data-elapsed>${fmtClock(elapsedMs())}</div>
      <div class="timer-meta"><span class="tag" style="--c:${catHex(t.categoryId)}">${esc(catName(t.categoryId))}</span>${task ? `<span>${esc(task.title)}</span>` : ''}</div>
      <div class="timer-actions">
        <button type="button" class="btn primary big" data-act="timer-stop">${icons.check} 멈추고 기록</button>
        <button type="button" class="btn ghost small" data-act="timer-cancel">기록 안 하고 취소</button>
      </div>
    </div>`;
  }
  const cats = state.categories.filter((c) => !c.archived);
  if (!timerCat || !state.catMap[timerCat] || state.catMap[timerCat].archived) timerCat = cats[0]?.id || null;
  const open = tasks.filter((x) => !x.done);
  return `<div class="timer">
    <div class="timer-top"><span class="label-en">TIMER</span><span class="muted">공부·일한 시간을 재서 타임테이블에 자동으로 칠해요</span></div>
    <div class="chips" data-tcats>${cats
      .map((c) => `<button type="button" class="chip" data-tcat="${esc(c.id)}" aria-pressed="${c.id === timerCat}"><i class="c" style="--c:${safeColor(c.color)}"></i>${esc(c.name)}</button>`)
      .join('')}</div>
    ${
      open.length
        ? `<select class="input" data-ttask aria-label="연결할 할 일"><option value="">할 일 연결 안 함</option>${open
            .map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`)
            .join('')}</select>`
        : ''
    }
    <button type="button" class="btn primary big" data-act="timer-start" ${timerCat ? '' : 'disabled'}>▶ 시작</button>
    <p class="hint tight">시작 시각만 기억해서, 화면이 꺼지거나 앱을 닫아도 시간이 이어져요.</p>
  </div>`;
}

export function timerBarHTML() {
  const t = running();
  if (!t) return '';
  return `<a class="timer-bar" href="#planner" style="--c:${catHex(t.categoryId)}"><i></i><span>${esc(catName(t.categoryId))} 기록 중</span><b data-elapsed>${fmtClock(elapsedMs())}</b></a>`;
}

function doneToast(dur) {
  if (dur) toast(`${fmtMin(Math.round(dur / 60000))} 기록했어요`);
  else toast('1분이 안 돼서 기록하지 않았어요');
}

// 6시간 넘게 켜져 있었으면 끝난 시각을 확인
async function stopWithConfirm() {
  const t = running();
  if (!t) return;
  const dur = Date.now() - t.startedAt;
  if (dur < 6 * 3600e3) {
    doneToast(await stopTimer());
    return;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const local = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  openSheet({
    title: '끝난 시각 확인',
    body: `<p class="confirm-msg">타이머가 <b>${fmtMin(Math.round(dur / 60000))}</b> 동안 켜져 있었어요. 끄는 걸 잊으셨다면 실제로 끝난 시각으로 고쳐 주세요.</p>
      <label class="field"><span class="field-label">끝난 시각</span><input type="datetime-local" class="input" data-end value="${local(Date.now())}" min="${local(t.startedAt)}" max="${local(Date.now())}"></label>`,
    footer: `<button type="button" class="btn danger" data-discard>기록 안 함</button><span class="spacer"></span><button type="button" class="btn primary" data-save>이대로 기록</button>`,
    onMount(el, close) {
      el.querySelector('[data-save]').addEventListener('click', async () => {
        const v = el.querySelector('[data-end]').value;
        const end = v ? new Date(v).getTime() : Date.now();
        close();
        doneToast(await stopTimer(end));
      });
      el.querySelector('[data-discard]').addEventListener('click', async () => {
        close();
        await cancelTimer();
        toast('타이머를 취소했어요');
      });
    },
  });
}

// 클릭 처리: 처리했으면 true
export function handleTimerClick(el, root) {
  const tc = el.closest('[data-tcat]');
  if (tc) {
    setTimerCat(tc.dataset.tcat);
    root.querySelectorAll('[data-tcat]').forEach((b) => b.setAttribute('aria-pressed', String(b === tc)));
    return true;
  }
  const act = el.closest('[data-act]')?.dataset.act;
  if (act === 'timer-start') {
    if (!timerCat) return true;
    const taskId = root.querySelector('[data-ttask]')?.value || null;
    startTimer({ categoryId: timerCat, taskId });
    toast(`${catName(timerCat)} 타이머를 시작했어요`);
    return true;
  }
  if (act === 'timer-stop') {
    stopWithConfirm();
    return true;
  }
  if (act === 'timer-cancel') {
    confirmBox('지금까지 잰 시간을 기록하지 않고 타이머를 취소할까요?', { ok: '취소하기', danger: true }).then(async (ok) => {
      if (ok) {
        await cancelTimer();
        toast('타이머를 취소했어요');
      }
    });
    return true;
  }
  return false;
}
