// 저장소 공통 창구. 화면 코드는 반드시 이 파일만 사용한다.
// 로그인 전/설정 없음: local.js(이 기기), 로그인 후: cloud.js(Firestore)
import * as local from './local.js';

let impl = local;
export let mode = 'local'; // 'local' | 'cloud'

// 앱 시작 때 한 번만 바꾼다 (화면을 그리기 전에)
export function useCloud(cloud) {
  impl = cloud;
  mode = 'cloud';
}

export const DEL = local.DEL;
export const COLLECTIONS = local.COLLECTIONS;

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// 새 문서 만들기 → id 반환
export function add(col, data) {
  const id = newId();
  const now = Date.now();
  impl.write([{ op: 'put', col, id, data: { ...data, id, createdAt: now, updatedAt: now } }]);
  return id;
}

// 일부 필드만 수정 (문서가 없으면 새로 만든다). 값에 DEL을 넣으면 그 필드 삭제
export function patch(col, id, data) {
  return impl.write([{ op: 'patch', col, id, data: { ...data, updatedAt: Date.now() } }]);
}

export function remove(col, id) {
  return impl.write([{ op: 'remove', col, id }]);
}

// 지운 문서 되돌리기 / 백업 불러오기 (시간 정보를 그대로 유지)
export function restore(col, doc) {
  return impl.write([{ op: 'put', col, id: doc.id, data: doc }]);
}

// 여러 작업을 한 번에: { op: 'add' | 'patch' | 'remove' | 'put', col, id?, data? }
export function batch(ops) {
  const now = Date.now();
  return impl.write(
    ops.map((o) => {
      if (o.op === 'add') {
        const id = o.id || newId();
        return { op: 'put', col: o.col, id, data: { ...o.data, id, createdAt: now, updatedAt: now } };
      }
      if (o.op === 'patch') return { ...o, data: { ...o.data, updatedAt: now } };
      return o;
    })
  );
}

export const watch = (col, filter, cb) => impl.watch(col, filter, cb);
export const watchDoc = (col, id, cb) => impl.watchDoc(col, id, cb);
export const getAll = (col) => impl.getAll(col);
export const get = (col, id) => impl.get(col, id);
export const query = (col, filter) => impl.query(col, filter);
export const replaceAll = (data) => impl.replaceAll(data);
