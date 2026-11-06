// 로그인 화면 (6단계부터: 구글 계정으로 로그인해야 데이터가 기기 간에 맞춰진다)
import { icons } from '../components/icons.js';
import { signInGoogle, authErrorMessage } from '../firebase.js';

export function showLogin(fb) {
  document.body.classList.add('logged-out');
  const main = document.getElementById('main');
  main.className = 'main';
  main.innerHTML = `<div class="login">
    <img class="login-logo" src="./icons/icon-192.png" alt="" width="84" height="84">
    <h1>하루</h1>
    <p class="login-sub">할 일 · 루틴 · 공부 시간 · 프로젝트</p>
    <button type="button" class="btn primary big login-btn" data-login>${icons.today} Google 계정으로 시작하기</button>
    <p class="login-err" data-err hidden></p>
    <ul class="login-notes">
      <li>로그인하면 폰 · 태블릿 · 노트북의 기록이 자동으로 맞춰져요.</li>
      <li>기록은 로그인한 본인만 볼 수 있어요.</li>
      <li>한 번 로그인하면 인터넷이 없어도 계속 쓸 수 있어요.</li>
    </ul>
  </div>`;
  const btn = main.querySelector('[data-login]');
  const err = main.querySelector('[data-err]');
  btn.addEventListener('click', async () => {
    err.hidden = true;
    btn.disabled = true;
    try {
      await signInGoogle(fb);
      location.reload(); // 로그인한 상태로 앱을 다시 시작
    } catch (e) {
      console.error(e);
      err.textContent = authErrorMessage(e);
      err.hidden = false;
      btn.disabled = false;
    }
  });
}

export function showFatal(message) {
  const main = document.getElementById('main');
  main.innerHTML = `<div class="login"><img class="login-logo" src="./icons/icon-192.png" alt="" width="84" height="84"><h1>하루</h1><p class="login-err">${message}</p>
    <button type="button" class="btn primary" onclick="location.reload()">다시 시도</button></div>`;
}
