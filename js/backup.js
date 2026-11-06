// 전체 데이터를 JSON 파일로 내보내기 / 불러오기
import * as store from './store/index.js';
import { VERSION, SCHEMA_VERSION } from './config.js';
import { today } from './util/date.js';

export async function exportBackup() {
  const data = {};
  for (const col of store.COLLECTIONS) data[col] = await store.getAll(col);
  const payload = { app: 'haru', schemaVersion: SCHEMA_VERSION, appVersion: VERSION, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `하루-백업-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일을 읽을 수 없어요.');
  }
  if (!obj || obj.app !== 'haru' || typeof obj.data !== 'object') throw new Error('하루 앱의 백업 파일이 아니에요.');
  if ((obj.schemaVersion || 1) > SCHEMA_VERSION) throw new Error('더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.');
  const data = {};
  for (const col of store.COLLECTIONS) {
    const arr = Array.isArray(obj.data[col]) ? obj.data[col] : [];
    data[col] = arr.filter((d) => d && typeof d === 'object' && typeof d.id === 'string' && d.id.length > 0 && d.id.length < 200);
  }
  return { data, exportedAt: obj.exportedAt, schemaVersion: obj.schemaVersion || 1 };
}

// mode: 'merge' (같은 항목은 더 최근에 고친 쪽 우선) | 'replace' (전부 바꾸기)
export async function applyBackup(parsed, mode) {
  if (mode === 'replace') {
    await store.replaceAll(parsed.data);
    return Object.values(parsed.data).reduce((n, arr) => n + arr.length, 0);
  }
  const ops = [];
  for (const col of store.COLLECTIONS) {
    const existing = new Map((await store.getAll(col)).map((d) => [d.id, d]));
    for (const d of parsed.data[col]) {
      const ex = existing.get(d.id);
      if (!ex || (d.updatedAt || 0) > (ex.updatedAt || 0)) ops.push({ op: 'put', col, id: d.id, data: d });
    }
  }
  if (ops.length) await store.batch(ops);
  return ops.length;
}
