// 화면 아래 잠깐 나타나는 알림. "되돌리기" 같은 버튼을 붙일 수 있다.
import { esc } from '../util/dom.js';

let current = null;

export function toast(message, { action, onAction, duration = 4500 } = {}) {
  current?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  document.getElementById('toast-root').appendChild(el);
  current = el;
  requestAnimationFrame(() => el.classList.add('show'));

  const hide = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 200);
    if (current === el) current = null;
  };
  const timer = setTimeout(hide, duration);
  el.querySelector('button')?.addEventListener('click', () => {
    clearTimeout(timer);
    hide();
    onAction?.();
  });
}
