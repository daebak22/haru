// 로그인한 계정 정보 (더보기 화면 표시, 로그아웃)
export const account = { user: null, fb: null };

export async function logout() {
  if (!account.fb) return;
  const { signOutUser } = await import('./firebase.js');
  await signOutUser(account.fb);
  location.reload();
}
