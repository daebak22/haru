// 화면 그리기에 쓰는 작은 도구 모음

// 사용자가 입력한 글자를 HTML에 안전하게 넣기 (코드로 해석되지 않도록)
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 짧은 시간에 여러 번 호출돼도 한 번만 실행 (화면이 가려져 있어도 동작하도록 setTimeout 사용)
export function frame(fn) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      fn();
    }, 0);
  };
}

// 내용을 바꿔도 각 영역의 스크롤 위치를 유지
// 입력 중인 칸([data-keep])은 다시 그려도 글자·커서를 유지 (예: 한 줄 일기 쓰는 도중 데이터가 바뀌어도)
export function setHTML(root, html) {
  const saved = [...root.querySelectorAll('[data-scroll]')].map((el) => [el.dataset.scroll, el.scrollTop]);
  const ae = document.activeElement;
  const keep = ae && root.contains(ae) && ae.dataset?.keep ? { k: ae.dataset.keep, v: ae.value, s: ae.selectionStart, e: ae.selectionEnd, saved: ae.dataset.saved } : null;
  root.innerHTML = html;
  for (const [key, top] of saved) {
    const el = root.querySelector(`[data-scroll="${key}"]`);
    if (el) el.scrollTop = top;
  }
  if (keep) {
    const el = root.querySelector(`[data-keep="${keep.k}"]`);
    if (el) {
      el.value = keep.v;
      if (keep.saved != null) el.dataset.saved = keep.saved;
      el.focus({ preventScroll: true });
      try {
        el.setSelectionRange(keep.s, keep.e);
      } catch {
        /* 무시 */
      }
    }
  }
}

export const safeColor = (c) => (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#9AA3B2');

// 색 바탕 위에 올릴 글자색 (밝은 색이면 진한 글자, 어두운 색이면 흰 글자)
export function readableOn(hex) {
  const c = safeColor(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.42 ? '#1B2330' : '#FFFFFF';
}

export function vibrate(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* 지원하지 않는 기기 */
  }
}
