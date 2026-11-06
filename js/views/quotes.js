// 저장함: 저장한 문장 · 저장한 용어 (더보기 → 저장함)
import { state, onState } from '../state.js';
import { frame, setHTML } from '../util/dom.js';
import { quoteById } from '../model/quotes.js';
import { termById } from '../model/terms.js';
import { icons } from '../components/icons.js';
import { quoteCardHTML, termCardHTML, toggleFavorite } from '../components/quoteCard.js';

let tab = 'quote'; // 'quote' | 'term' (다른 화면에 다녀와도 기억)

const savedList = (map, find) =>
  Object.entries(map || {})
    .filter(([id]) => find(id))
    .sort((a, b) => b[1] - a[1]) // 최근에 저장한 것부터
    .map(([id]) => find(id));

export function mount(root) {
  const render = frame(() => {
    const quotes = savedList(state.settings.favQuotes, quoteById);
    const terms = savedList(state.settings.favTerms, termById);
    const list = tab === 'quote' ? quotes.map((q) => quoteCardHTML(q)) : terms.map((t) => termCardHTML(t));
    const empty =
      tab === 'quote'
        ? '아직 저장한 문장이 없어요.<br>오늘 화면 문장 카드에서 <b>♥</b>를 눌러 보세요.'
        : '아직 저장한 용어가 없어요.<br>오늘 화면 아래 용어 카드에서 <b>♥</b>를 눌러 보세요.';
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="saved">
        <header class="page-head">
          <a class="icon-btn" href="#more" aria-label="뒤로">${icons.left}</a>
          <h1>저장함</h1>
        </header>
        <div class="seg seg-full" data-tabs>
          <button type="button" data-tab="quote" aria-pressed="${tab === 'quote'}">문장 ${quotes.length}</button>
          <button type="button" data-tab="term" aria-pressed="${tab === 'term'}">부동산금융 용어 ${terms.length}</button>
        </div>
        <div class="quote-list">${list.length ? list.join('') : `<div class="list"><p class="empty">${empty}</p></div>`}</div>
      </div>`
    );
  });

  const onClick = (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      tab = t.dataset.tab;
      render();
      return;
    }
    const fav = e.target.closest('[data-act="fav"]');
    if (fav && root.contains(fav)) toggleFavorite(fav.dataset.kind, fav.dataset.fid);
  };
  root.addEventListener('click', onClick);
  const unState = onState(render);
  render();
  return () => {
    root.removeEventListener('click', onClick);
    unState();
  };
}
