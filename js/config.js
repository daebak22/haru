// 앱 전체 설정값. 배포할 때마다 VERSION을 올린다 (sw.js의 VERSION과 같게).
export const APP_NAME = '하루';
export const VERSION = '0.2.0';

// 구글 캘린더 읽기용 OAuth 클라이언트 ID (Google Cloud 콘솔에서 만든 값. 공개돼도 괜찮은 값)
// 예: '1234567890-abcdefg.apps.googleusercontent.com'
export const GOOGLE_CLIENT_ID = '';
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
export const PALETTE = [
  '#EF5A5A', '#F7894A', '#F2B33D', '#4CB782', '#2DB5A8', '#3B9BF0',
  '#4C6EF5', '#8B5CF6', '#E05CA4', '#B08463', '#7A8F3C', '#8A94A6',
];

export const DEFAULT_CATEGORIES = [
  { name: '공부', color: '#3B9BF0' },
  { name: '운동', color: '#4CB782' },
  { name: '생활', color: '#F7894A' },
];
