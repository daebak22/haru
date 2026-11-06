// 처음 로그인할 때: 이 기기에만 있던 데이터를 계정(Firestore)으로 옮기기
// - 같은 항목은 더 최근에 고친 쪽 우선
// - 기기마다 따로 만든 같은 이름의 카테고리(예: "공부")는 하나로 합치고, 할 일·루틴·타임테이블의 색 연결도 맞춰 줌
import * as local from './store/local.js';
import { COLLECTIONS } from './store/local.js';

export async function localSummary() {
  const n = {};
  for (const c of COLLECTIONS) n[c] = (await local.getAll(c)).length;
  const meaningful = n.tasks + n.routines + n.projects + n.days > 0;
  return { n, meaningful };
}

export async function migrateLocalToCloud(cloud) {
  const remoteCats = await cloud.getAll('categories');
  const byName = new Map(remoteCats.map((c) => [c.name.trim(), c.id]));
  const remap = {}; // 이 기기 카테고리 id → 계정 카테고리 id
  const ops = [];

  for (const c of await local.getAll('categories')) {
    const same = byName.get((c.name || '').trim());
    if (same && same !== c.id) remap[c.id] = same;
  }
  const fix = (id) => (id && remap[id]) || id;

  for (const col of COLLECTIONS) {
    const docs = await local.getAll(col);
    if (!docs.length) continue;
    const remote = new Map((col === 'categories' ? remoteCats : await cloud.getAll(col)).map((d) => [d.id, d]));
    for (let d of docs) {
      if (col === 'categories' && remap[d.id]) continue; // 같은 이름이 이미 있음
      if (col === 'tasks' || col === 'routines') d = { ...d, categoryId: fix(d.categoryId) };
      if (col === 'days') {
        const cells = Object.fromEntries(Object.entries(d.cells || {}).map(([i, v]) => [i, fix(v)]));
        const sessions = Object.fromEntries(Object.entries(d.sessions || {}).map(([k, s]) => [k, { ...s, categoryId: fix(s.categoryId) }]));
        d = { ...d, cells, sessions };
      }
      if (col === 'meta' && d.timer) d = { ...d, timer: { ...d.timer, categoryId: fix(d.timer.categoryId) } };
      const r = remote.get(d.id);
      if (col === 'meta' && r) {
        // 설정은 합치기: 저장한 문장·용어·D-Day는 양쪽 모두 유지
        ops.push({
          op: 'patch',
          col,
          id: d.id,
          data: { favQuotes: { ...(d.favQuotes || {}), ...(r.favQuotes || {}) }, favTerms: { ...(d.favTerms || {}), ...(r.favTerms || {}) }, ddays: { ...(d.ddays || {}), ...(r.ddays || {}) } },
        });
        continue;
      }
      if (!r || (d.updatedAt || 0) > (r.updatedAt || 0)) ops.push({ op: 'put', col, id: d.id, data: d });
    }
  }
  await cloud.write(ops);
  return ops.length;
}
