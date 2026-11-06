// 1~4단계용 저장소: 브라우저 localStorage에 Firestore와 같은 구조로 저장한다.
// 5단계에서 같은 기능을 가진 cloud.js(Firestore)로 교체한다.

export const DEL = Symbol('delete'); // 필드 삭제 표시
export const COLLECTIONS = ['categories', 'tasks', 'routines', 'days', 'projects', 'meta'];

const PREFIX = 'haru:v1:';
const cache = new Map();
const watchers = new Set();
const pending = new Set();

const clone = (v) => structuredClone(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function load(col) {
  if (!cache.has(col)) {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(PREFIX + col)) || {};
    } catch {
      data = {};
    }
    cache.set(col, data);
  }
  return cache.get(col);
}

function persist(col) {
  try {
    localStorage.setItem(PREFIX + col, JSON.stringify(load(col)));
  } catch (e) {
    console.error(e);
    window.dispatchEvent(new CustomEvent('haru:storage-error', { detail: e }));
  }
}

// 필드 단위 합치기 (Firestore의 set merge와 같은 방식)
function merge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v === DEL) delete target[k];
    else if (isObj(v)) target[k] = merge(isObj(target[k]) ? target[k] : {}, v);
    else target[k] = Array.isArray(v) ? v.slice() : v;
  }
  return target;
}

function matches(doc, f) {
  if (!f) return true;
  const v = doc[f.field] ?? null;
  if ('eq' in f) return v === f.eq;
  if (v === null) return false;
  if (f.gte != null && v < f.gte) return false;
  if (f.lte != null && v > f.lte) return false;
  return true;
}

function deliver(w) {
  const data = load(w.col);
  if (w.id) w.cb(data[w.id] ? clone(data[w.id]) : null);
  else w.cb(Object.values(data).filter((d) => matches(d, w.filter)).map(clone));
}

function schedule(col) {
  pending.add(col);
  if (pending.size === 1) queueMicrotask(flush);
}

function flush() {
  const cols = new Set(pending);
  pending.clear();
  for (const w of watchers) if (cols.has(w.col)) deliver(w);
}

function addWatcher(w) {
  watchers.add(w);
  queueMicrotask(() => watchers.has(w) && deliver(w));
  return () => watchers.delete(w);
}

export const watch = (col, filter, cb) => addWatcher({ col, filter, cb });
export const watchDoc = (col, id, cb) => addWatcher({ col, id, cb });

export async function getAll(col) {
  return Object.values(load(col)).map(clone);
}
export async function get(col, id) {
  const d = load(col)[id];
  return d ? clone(d) : null;
}
export async function query(col, filter) {
  return Object.values(load(col)).filter((d) => matches(d, filter)).map(clone);
}

// ops: [{ op: 'put' | 'patch' | 'remove', col, id, data }]
export async function write(ops) {
  const cols = new Set();
  for (const o of ops) {
    const data = load(o.col);
    if (o.op === 'put') data[o.id] = clone(o.data);
    else if (o.op === 'patch') data[o.id] = merge(data[o.id] || { id: o.id, createdAt: o.data.updatedAt }, o.data);
    else if (o.op === 'remove') delete data[o.id];
    cols.add(o.col);
  }
  for (const c of cols) {
    persist(c);
    schedule(c);
  }
}

export async function replaceAll(dataByCol) {
  for (const col of COLLECTIONS) {
    cache.set(col, Object.fromEntries((dataByCol[col] || []).map((d) => [d.id, clone(d)])));
    persist(col);
    schedule(col);
  }
}

// 같은 노트북의 다른 탭에서 바꾼 내용도 반영
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith(PREFIX)) return;
  const col = e.key.slice(PREFIX.length);
  if (COLLECTIONS.includes(col)) {
    cache.delete(col);
    schedule(col);
  }
});
