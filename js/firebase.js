// Firebase 불러오기 (구글 공식 주소, 버전 고정). 로그인 정보와 데이터는 기기에도 저장돼서 오프라인에서도 열린다.
import { FIREBASE_CONFIG, FIREBASE_SDK } from './config.js';

const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}`;
export const firebaseEnabled = !!FIREBASE_CONFIG.apiKey;
export const SDK_URLS = ['app', 'auth', 'firestore'].map((m) => `${BASE}/firebase-${m}.js`);

let fb = null;

export async function loadFirebase() {
  if (fb) return fb;
  const [appM, authM, fsM] = await Promise.all(SDK_URLS.map((u) => import(u)));
  const app = appM.initializeApp(FIREBASE_CONFIG);
  const auth = authM.initializeAuth(app, {
    persistence: [authM.indexedDBLocalPersistence, authM.browserLocalPersistence],
    popupRedirectResolver: authM.browserPopupRedirectResolver,
  });
  const db = fsM.initializeFirestore(app, {
    localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  fb = { app, auth, db, authM, fsM };
  return fb;
}

// 저장된 로그인 상태 확인 (오프라인에서도 바로 응답)
export function waitForUser(f) {
  return new Promise((resolve) => {
    const un = f.authM.onAuthStateChanged(f.auth, (u) => {
      un();
      resolve(u);
    });
  });
}

// 반드시 버튼을 누른 순간에 호출 (로그인 창이 막히지 않게)
export function signInGoogle(f) {
  const provider = new f.authM.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return f.authM.signInWithPopup(f.auth, provider);
}

export const signOutUser = (f) => f.authM.signOut(f.auth);

export function authErrorMessage(e) {
  const code = e?.code || '';
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return '로그인 창이 닫혔어요. 다시 눌러 주세요.';
  if (code.includes('popup-blocked')) return '로그인 창이 막혔어요. 한 번 더 눌러 주세요.';
  if (code.includes('unauthorized-domain')) return '이 주소는 아직 로그인이 허용되지 않았어요. (Firebase 승인된 도메인 설정 필요)';
  if (code.includes('network')) return '인터넷 연결을 확인해 주세요.';
  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
