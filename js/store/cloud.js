// 6단계 저장소: Cloud Firestore (users/{uid}/컬렉션/문서)
// local.js와 사용법이 똑같다. 기기에 먼저 저장되고(오프라인 가능) 연결되면 자동으로 서버와 맞춰진다.
import { DEL, COLLECTIONS } from './local.js';

export function createCloud(fb, uid) {
  const { db, fsM } = fb;
  const { collection, doc, query, where, onSnapshot, getDocs, getDoc, writeBatch, deleteField } = fsM;

  const col = (c) => collection(db, 'users', uid, c);
  const ref = (c, id) => doc(db, 'users', uid, c, String(id));
  const toDoc = (s) => ({ ...s.data(), id: s.id });

  // 조회 조건: 필드 1개만 (복합 색인이 필요 없게)
  function q(c, f) {
    if (!f) return col(c);
    if ('eq' in f) return query(col(c), where(f.field, '==', f.eq));
    const conds = [];
    if (f.gte != null) conds.push(where(f.field, '>=', f.gte));
    if (f.lte != null) conds.push(where(f.field, '<=', f.lte));
    return query(col(c), ...conds);
  }

  // DEL 표시 → Firestore의 필드 삭제
  const conv = (v) => {
    if (v === DEL) return deleteField();
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = conv(x);
      return o;
    }
    return v;
  };

  const onErr = (e) => {
    console.error(e);
    window.dispatchEvent(new CustomEvent('haru:sync-error', { detail: e }));
  };

  const api = {
    watch(c, f, cb) {
      return onSnapshot(q(c, f), (snap) => cb(snap.docs.map(toDoc)), onErr);
    },
    watchDoc(c, id, cb) {
      return onSnapshot(ref(c, id), (s) => cb(s.exists() ? toDoc(s) : null), onErr);
    },
    async getAll(c) {
      return (await getDocs(col(c))).docs.map(toDoc);
    },
    async get(c, id) {
      const s = await getDoc(ref(c, id));
      return s.exists() ? toDoc(s) : null;
    },
    async query(c, f) {
      return (await getDocs(q(c, f))).docs.map(toDoc);
    },
    // 서버 응답을 기다리지 않음 → 오프라인에서도 화면이 바로 바뀌고, 연결되면 자동 전송
    write(ops) {
      for (let i = 0; i < ops.length; i += 450) {
        const b = writeBatch(db);
        for (const o of ops.slice(i, i + 450)) {
          const r = ref(o.col, o.id);
          if (o.op === 'put') b.set(r, conv(o.data));
          else if (o.op === 'patch') b.set(r, conv(o.data), { merge: true });
          else if (o.op === 'remove') b.delete(r);
        }
        b.commit().catch(onErr);
      }
      return Promise.resolve();
    },
    async replaceAll(data) {
      const ops = [];
      for (const c of COLLECTIONS) {
        (await api.getAll(c)).forEach((d) => ops.push({ op: 'remove', col: c, id: d.id }));
        (data[c] || []).forEach((d) => ops.push({ op: 'put', col: c, id: d.id, data: d }));
      }
      return api.write(ops);
    },
  };
  return api;
}
