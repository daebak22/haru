// 루틴 반복 계산. 루틴은 날짜마다 저장하지 않고 규칙으로 계산한다.
import { parse, daysInMonth, weekdayName } from '../util/date.js';

export const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function occursOn(r, date) {
  if (!r || r.active === false) return false;
  if (r.startDate && date < r.startDate) return false;
  if (r.endDate && date > r.endDate) return false;
  const rep = r.repeat || { type: 'daily' };
  const d = parse(date);
  if (rep.type === 'weekly') return (rep.weekdays || []).includes(d.getDay());
  if (rep.type === 'monthly') {
    const day = d.getDate();
    const last = daysInMonth(d.getFullYear(), d.getMonth());
    // 31일처럼 그 달에 없는 날짜는 말일에 표시
    return (rep.monthDays || []).some((md) => md === day || (md > last && day === last));
  }
  return true; // daily
}

export function describeRepeat(rep = { type: 'daily' }) {
  if (rep.type === 'weekly') {
    const w = MON_FIRST.filter((i) => (rep.weekdays || []).includes(i));
    if (w.length === 7) return '매일';
    if (w.join() === '1,2,3,4,5') return '평일마다';
    if (w.join() === '6,0') return '주말마다';
    return '매주 ' + w.map(weekdayName).join('·');
  }
  if (rep.type === 'monthly') {
    const days = (rep.monthDays || []).slice().sort((a, b) => a - b);
    return '매월 ' + days.join(', ') + '일';
  }
  return '매일';
}

export const sortRoutines = (arr) =>
  arr.slice().sort((a, b) => {
    const x = a.time || '99:99';
    const y = b.time || '99:99';
    return (x < y ? -1 : x > y ? 1 : 0) || (a.order || 0) - (b.order || 0);
  });
