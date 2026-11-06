// 여러 화면이 함께 쓰는 데이터: 설정, 카테고리, 루틴 (개수가 적어 항상 구독)
import * as store from './store/index.js';
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from './config.js';
import { setDayStartHour } from './util/date.js';

export const state = {
  settings: { ...DEFAULT_SETTINGS },
  categories: [],
  catMap: {},
  routines: [],
};

const listeners = new Set();
let queued = false;
function emit() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    listeners.forEach((fn) => fn(state));
  });
}

export function onState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyTheme(theme) {
  const el = document.documentElement;
  if (theme === 'light' || theme === 'dark') el.dataset.theme = theme;
  else delete el.dataset.theme;
  try {
    localStorage.setItem('haru:theme', theme);
  } catch {
    /* 무시 */
  }
  const bg = getComputedStyle(el).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#F5F4EF');
}

export function updateSettings(patch) {
  return store.patch('meta', 'settings', patch);
}

export function catColor(id) {
  return state.catMap[id]?.color || 'var(--nocat)';
}

// 계산에 쓸 실제 색 값 (분류 없음 = 회색)
export function catHex(id) {
  return state.catMap[id]?.color || '#9AA3B2';
}

export function startState() {
  store.watchDoc('meta', 'settings', (doc) => {
    state.settings = { ...DEFAULT_SETTINGS, ...(doc || {}) };
    setDayStartHour(state.settings.dayStartHour);
    applyTheme(state.settings.theme);
    emit();
  });
  store.watch('categories', null, (docs) => {
    state.categories = docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    state.catMap = Object.fromEntries(docs.map((c) => [c.id, c]));
    emit();
  });
  store.watch('routines', null, (docs) => {
    state.routines = docs;
    emit();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(state.settings.theme));
}

// 처음 실행할 때 기본 카테고리 3개 만들기
export async function seedIfEmpty() {
  let seeded = false;
  try {
    seeded = !!localStorage.getItem('haru:v1:seeded');
  } catch {
    /* 무시 */
  }
  if (seeded) return;
  const cats = await store.getAll('categories');
  if (!cats.length) {
    store.batch(DEFAULT_CATEGORIES.map((c, i) => ({ op: 'add', col: 'categories', data: { ...c, order: i, archived: false } })));
  }
  try {
    localStorage.setItem('haru:v1:seeded', '1');
  } catch {
    /* 무시 */
  }
}
