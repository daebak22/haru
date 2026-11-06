// 날짜 계산. 날짜는 항상 "YYYY-MM-DD" 문자열로 다룬다.

let dayStartHour = 6;
export function setDayStartHour(h) {
  dayStartHour = Number.isInteger(h) ? h : 6;
}

const pad = (n) => String(n).padStart(2, '0');
const WD = ['일', '월', '화', '수', '목', '금', '토'];

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 앱의 "오늘": 하루 시작 시각(기본 06:00) 전이면 전날
export const today = () => ymd(new Date(Date.now() - dayStartHour * 3600e3));

export function addDays(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

const utc = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);

export const dow = (s) => parse(s).getDay();
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate(); // m: 0~11
export const weekdayName = (i) => WD[i];
export const weekdayOrder = (weekStart) => [0, 1, 2, 3, 4, 5, 6].map((i) => (i + weekStart) % 7);

export function fmtLong(s) {
  const d = parse(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

export const fmtMonthDay = (s) => {
  const d = parse(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
export const weekdayFull = (s) => WD[parse(s).getDay()] + '요일';

export function fmtShort(s) {
  const d = parse(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function relLabel(s) {
  const n = diffDays(today(), s);
  if (n === 0) return '오늘';
  if (n === 1) return '내일';
  if (n === -1) return '어제';
  return '';
}

// 월간 달력에 보일 날짜들 (앞뒤 달 포함, 7의 배수)
export function monthGrid(y, m, weekStart = 1) {
  const offset = (new Date(y, m, 1).getDay() - weekStart + 7) % 7;
  const total = Math.ceil((offset + daysInMonth(y, m)) / 7) * 7;
  const days = [];
  for (let i = 0; i < total; i++) days.push(ymd(new Date(y, m, 1 - offset + i)));
  return { days };
}
