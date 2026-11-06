// 서비스 워커 등록 + 새 버전 알림
// - 인터넷 주소(https)에서만 켬. 노트북 테스트(localhost)에서는 끔 → 고친 파일이 바로 보이도록
// - 새 버전을 받으면 "새 버전이 있어요 [업데이트]" 알림 → 누르면 새 버전으로 바꾸고 새로고침
import { toast } from './components/toast.js';

const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  if (isLocal) {
    // 예전에 등록된 것이 있으면 정리 (테스트 중 옛 파일이 보이는 문제 방지)
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach((r) => r.unregister());
    return;
  }

  let reg;
  try {
    reg = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
  } catch (e) {
    console.warn('서비스 워커 등록 실패', e);
    return;
  }

  const offer = (worker) => {
    if (!worker || !navigator.serviceWorker.controller) return; // 첫 설치 때는 알림 불필요
    toast('새 버전이 있어요', {
      action: '업데이트',
      duration: 600000,
      onAction: () => worker.postMessage('SKIP_WAITING'),
    });
  };

  if (reg.waiting) offer(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => {
      if (w.state === 'installed') offer(w);
    });
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  // 앱을 다시 볼 때마다 새 버전 확인
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => {});
  });
}
