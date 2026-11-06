// 부동산금융 용어 사전: 분야별로 보기, 검색, 저장한 것만 보기
import { state, onState } from '../state.js';
import { esc } from '../util/dom.js';
import { TERMS, TERM_CATS } from '../model/terms.js';
import { icons } from '../components/icons.js';
import { termCardHTML, toggleFavorite, isSaved } from '../components/quoteCard.js';

// 다른 화면에 다녀와도 보던 분야·검색어 기억
let cat = 'all';
let query = '';

export function mount(root) {
  root.innerHTML = `<div class="page-scroll" data-scroll="terms">
    <header class="page-head">
      <a class="icon-btn" href="#more" aria-label="뒤로">${icons.left}</a>
      <h1>부동산금융 용어 사전</h1>
    </header>
    <input class="input search" type="search" placeholder="용어 검색 (예: PF, 리츠, 셀다운)" value="${esc(query)}" data-search aria-label="용어 검색">
    <div class="chips cat-filter" data-cats></div>
    <p class="hint" data-count></p>
    <div class="quote-list" data-list></div>
  </div>`;
  const listEl = root.querySelector('[data-list]');
  const catsEl = root.querySelector('[data-cats]');
  const countEl = root.querySelector('[data-count]');

  // 목록 부분만 다시 그림 (검색창 입력이 끊기지 않게)
  const renderList = () => {
    const q = query.trim().toLowerCase();
    const items = TERMS.filter((t) => {
      if (cat === 'saved' && !isSaved('term', t.id)) return false;
      if (cat !== 'all' && cat !== 'saved' && t.cat !== cat) return false;
      if (!q) return true;
      return (t.term + ' ' + t.en + ' ' + t.desc).toLowerCase().includes(q);
    });
    const saved = TERMS.filter((t) => isSaved('term', t.id)).length;
    catsEl.innerHTML = [
      ['all', `전체 ${TERMS.length}`],
      ...TERM_CATS.map((c) => [c.id, `${c.name} ${TERMS.filter((t) => t.cat === c.id).length}`]),
      ['saved', `♥ 저장 ${saved}`],
    ]
      .map(([id, label]) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${cat === id}">${esc(label)}</button>`)
      .join('');
    countEl.textContent = items.length ? `${items.length}개 · 카드의 ♥를 누르면 저장함에 모여요` : '';
    listEl.innerHTML = items.length
      ? items.map((t) => termCardHTML(t)).join('')
      : `<div class="list"><p class="empty">${cat === 'saved' ? '아직 저장한 용어가 없어요.' : '찾는 용어가 없어요.'}</p></div>`;
  };

  const onInput = (e) => {
    if (!e.target.matches('[data-search]')) return;
    query = e.target.value;
    renderList();
  };
  const onClick = (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) {
      cat = c.dataset.cat;
      renderList();
      root.querySelector('.page-scroll').scrollTop = 0;
      window.scrollTo(0, 0);
      return;
    }
    const fav = e.target.closest('[data-act="fav"]');
    if (fav) toggleFavorite(fav.dataset.kind, fav.dataset.fid);
  };
  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  const unState = onState(renderList);
  renderList();
  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('click', onClick);
    unState();
  };
}
