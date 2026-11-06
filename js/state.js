// 여러 화면이 함께 쓰는 데이터: 설정, 카테고리, 루틴 (개수가 적어 항상 구독)
import * as store from './store/index.js';
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES, PALETTE, OLD_PALETTES } from './config.js';
import { setDayStartHour } from './util/date.js';

export const state = {
  settings: { ...DEFAULT_SETTINGS },
  categories: [],
  catMap: {},
  routines: [],
  projects: [],
  projectMap: {},
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
  // 프로젝트도 개수가 적어서 항상 구독 (달력 막대, 할 일 연결에 사용)
  store.watch('projects', null, (docs) => {
    state.projects = docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    state.projectMap = Object.fromEntries(docs.map((p) => [p.id, p]));
    emit();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(state.settings.theme));
}

// 예전 버전 색으로 만든 카테고리를 새 팔레트 색으로 한 번만 바꿔 줌 (직접 고른 색은 그대로)
export async function migratePalette() {
  try {
    if (localStorage.getItem('haru:v1:palette3')) return;
  } catch {
    return;
  }
  const cats = await store.getAll('categories');
  const ops = [];
  for (const c of cats) {
    for (const old of OLD_PALETTES) {
      const i = old.findIndex((x) => x.toLowerCase() === (c.color || '').toLowerCase());
      if (i >= 0) {
        ops.push({ op: 'patch', col: 'categories', id: c.id, data: { color: PALETTE[i] } });
        break;
      }
    }
  }
  if (ops.length) await store.batch(ops);
  try {
    localStorage.setItem('haru:v1:palette3', '1');
  } catch {
    /* 무시 */
  }
}

// 처음 실행할 때 기본 카테고리 3개 만들기 (key: 이 기기/계정별로 한 번만)
export async function seedIfEmpty(key = 'haru:v1:seeded') {
  let seeded = false;
  try {
    seeded = !!localStorage.getItem(key);
  } catch {
    /* 무시 */
  }
  if (seeded) return;
  if (store.mode === 'cloud' && !navigator.onLine) return; // 다른 기기의 카테고리를 확인할 수 없을 땐 다음에
  const cats = await store.getAll('categories');
  if (!cats.length) {
    store.batch(DEFAULT_CATEGORIES.map((c, i) => ({ op: 'add', col: 'categories', data: { ...c, order: i, archived: false } })));
  }
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* 무시 */
  }
}
