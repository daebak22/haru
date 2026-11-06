// 아래에서 올라오는 입력창(시트), 메뉴, 확인창.
// 안드로이드 "뒤로" 버튼을 누르면 앱이 닫히지 않고 시트만 닫히도록 기록(history)을 하나 추가한다.
import { esc } from '../util/dom.js';
import { icons } from './icons.js';

const stack = [];
let ignorePop = 0;
let afterBack = []; // 시트가 닫히며 생긴 "뒤로 가기"가 끝난 뒤 실행할 일

// 시트를 닫은 직후 화면을 이동해야 할 때 사용 (뒤로 가기와 겹쳐 이동이 취소되는 것 방지)
export function whenSheetsClosed(fn) {
  if (ignorePop > 0) afterBack.push(fn);
  else fn();
}

window.addEventListener('popstate', () => {
  if (ignorePop > 0) {
    ignorePop--;
    if (ignorePop === 0 && afterBack.length) {
      const fns = afterBack;
      afterBack = [];
      fns.forEach((f) => f());
    }
    return;
  }
  const top = stack[stack.length - 1];
  if (top) top.close({ fromPop: true });
});

export function openSheet({ title, body, footer = '', bodyClass = '', onMount, onClose }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `
    <div class="sheet-backdrop" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip" aria-hidden="true"></div>
      <div class="sheet-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="닫기">${icons.x}</button>
      </div>
      <div class="sheet-body ${bodyClass}">${body}</div>
      ${footer ? `<div class="sheet-foot">${footer}</div>` : ''}
    </div>`;
  document.getElementById('sheet-root').appendChild(wrap);

  const entry = { closed: false, close };
  if (stack.length === 0) history.pushState({ sheet: true }, '');
  stack.push(entry);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => wrap.classList.add('open'));

  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
  const onKey = (e) => {
    if (e.key === 'Escape' && stack[stack.length - 1] === entry) close();
  };
  document.addEventListener('keydown', onKey);

  function close({ fromPop = false } = {}) {
    if (entry.closed) return;
    entry.closed = true;
    document.removeEventListener('keydown', onKey);
    stack.splice(stack.indexOf(entry), 1);
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 220);
    if (stack.length === 0) {
      document.body.classList.remove('sheet-open');
      if (!fromPop) {
        ignorePop++;
        history.back();
      }
    } else if (fromPop) {
      history.pushState({ sheet: true }, '');
    }
    onClose?.();
  }

  onMount?.(wrap.querySelector('.sheet'), close);
  return close;
}

// 선택 메뉴: items = [{ label, icon?, danger?, onClick }]
export function openMenu(title, items) {
  const list = items.filter(Boolean);
  const body = list
    .map(
      (it, i) =>
        `<button type="button" class="menu-item${it.danger ? ' danger' : ''}" data-i="${i}">${it.icon ? icons[it.icon] : ''}<span class="grow">${esc(it.label)}</span></button>`
    )
    .join('');
  openSheet({
    title,
    body,
    bodyClass: 'menu-body',
    onMount(el, close) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        // 다음 시트를 먼저 연 뒤 메뉴를 닫는다 (뒤로 가기 기록이 꼬이지 않게)
        list[+b.dataset.i].onClick?.();
        close();
      });
    },
  });
}

export function confirmBox(message, { title = '확인', ok = '확인', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      body: `<p class="confirm-msg">${esc(message)}</p>`,
      footer: `<span class="spacer"></span><button type="button" class="btn ghost" data-close>취소</button><button type="button" class="btn ${danger ? 'danger-fill' : 'primary'}" data-ok>${esc(ok)}</button>`,
      onMount(el, close) {
        el.querySelector('[data-ok]').addEventListener('click', () => {
          answered = true;
          resolve(true);
          close();
        });
      },
      onClose() {
        if (!answered) resolve(false);
      },
    });
  });
}
