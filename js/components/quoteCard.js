// 오늘의 한 문장 · 오늘의 용어 카드와 ♥ 저장
// 저장 목록은 설정 문서(favQuotes, favTerms)에 보관 → 동기화 단계 이후 기기 간 공유
import * as store from '../store/index.js';
import { state, updateSettings } from '../state.js';
import { esc } from '../util/dom.js';
import { icons } from './icons.js';
import { toast } from './toast.js';

const FIELD = { quote: 'favQuotes', term: 'favTerms' };
export const isSaved = (kind, id) => !!state.settings[FIELD[kind]]?.[id];

function favButton(kind, id) {
  const saved = isSaved(kind, id);
  return `<button type="button" class="quote-fav" data-act="fav" data-kind="${kind}" data-fid="${esc(id)}" aria-pressed="${saved}" aria-label="${saved ? '저장 취소' : '저장'}">${icons.heart}</button>`;
}

// nextable: 오늘 화면처럼 눌러서 다음 것으로 넘길 수 있는지
export function quoteCardHTML(q, { nextable = false } = {}) {
  return `<div class="quote" data-kind="quote">
    <div class="quote-main"${nextable ? ' data-act="quote-next" role="button" tabindex="0" aria-label="누르면 다른 문장"' : ''}>
      <p class="quote-text">${esc(q.text)}</p>
      <p class="quote-by">${esc(q.by)}</p>
    </div>
    ${favButton('quote', q.id)}
  </div>`;
}

export function termCardHTML(t, { nextable = false } = {}) {
  return `<div class="term" data-kind="term">
    <div class="term-main"${nextable ? ' data-act="term-next" role="button" tabindex="0" aria-label="누르면 다른 용어"' : ''}>
      <p class="term-label">${icons.book}<span>${nextable ? '오늘의 부동산금융 용어' : '부동산금융 용어'}</span></p>
      <p class="term-title">${esc(t.term)}</p>
      <p class="term-en">${esc(t.en)}</p>
      <p class="term-desc">${esc(t.desc)}</p>
    </div>
    ${favButton('term', t.id)}
  </div>`;
}

export function toggleFavorite(kind, id) {
  const field = FIELD[kind];
  const saved = isSaved(kind, id);
  const name = kind === 'term' ? '용어' : '문장';
  if (saved) {
    const at = state.settings[field][id];
    updateSettings({ [field]: { [id]: store.DEL } });
    toast(`${name} 저장을 취소했어요`, { action: '되돌리기', onAction: () => updateSettings({ [field]: { [id]: at } }) });
  } else {
    updateSettings({ [field]: { [id]: Date.now() } });
    toast(`${name}을 저장했어요 · 더보기 → 저장함`.replace('용어을', '용어를'));
  }
}
