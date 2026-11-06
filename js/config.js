// 앱 전체 설정값. 배포할 때마다 VERSION을 올린다 (sw.js의 VERSION과 같게).
export const APP_NAME = '하루';
export const VERSION = '0.4.0';

// 구글 캘린더 읽기용 OAuth 클라이언트 ID (Google Cloud 콘솔에서 만든 값. 공개돼도 괜찮은 값)
// 예: '1234567890-abcdefg.apps.googleusercontent.com'
export const GOOGLE_CLIENT_ID = '492568552375-65tbffroaho7n1difjffemcelfscjisg.apps.googleusercontent.com';
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = {
  theme: 'light',       // 'system' | 'light' | 'dark' (기본: 밝게)
  dayStartHour: 6,      // 하루 시작 시각 (06:00 전은 전날로 계산)
  weekStart: 1,         // 1 = 월요일, 0 = 일요일
  showQuote: true,      // 오늘 화면에 "오늘의 한 문장" 보이기
  favQuotes: {},        // 저장한 문장 { 문장id: 저장한 시각 }
  ddays: {},
  gcalCalendars: null,  // 표시할 구글 캘린더 id 목록 (null = 구글에서 체크된 캘린더 그대로)
  showTerm: true,       // 오늘 화면에 "오늘의 부동산금융 용어" 보이기
  favTerms: {},         // 저장한 용어 { 용어id: 저장한 시각 }
  timer: null,
  schemaVersion: SCHEMA_VERSION,
};

// 카테고리 기본 팔레트 (라이트/다크 모두에서 잘 보이는 색)
// 종이 플래너에 어울리는 차분한 파스텔 (형광펜·색연필 느낌)
export const PALETTE = [
  '#E07A73', '#E8A15B', '#E3C15A', '#8DB580', '#6FB3A8', '#7FA7D6',
  '#5E77B5', '#A08BC9', '#D98BA8', '#B49580', '#8E9A6B', '#9A9890',
];

// 예전 버전 팔레트 → 새 팔레트 (같은 자리 색으로 한 번만 자동 변환)
export const OLD_PALETTES = [
  ['#EF5A5A', '#F7894A', '#F2B33D', '#4CB782', '#2DB5A8', '#3B9BF0', '#4C6EF5', '#8B5CF6', '#E05CA4', '#B08463', '#7A8F3C', '#8A94A6'],
  ['#E5484D', '#F76B15', '#E2A400', '#46A758', '#12A594', '#0090FF', '#3E63DD', '#8E4EC6', '#D6409F', '#A18072', '#5C7C2E', '#6F6E77'],
];

export const DEFAULT_CATEGORIES = [
  { name: '공부', color: '#7FA7D6' },
  { name: '운동', color: '#8DB580' },
  { name: '생활', color: '#E8A15B' },
];
