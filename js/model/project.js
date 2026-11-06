// 프로젝트: 상태, 진행률, 정렬
import { today, diffDays } from '../util/date.js';

export const STATUS = [
  { id: 'active', name: '진행중' },
  { id: 'planned', name: '예정' },
  { id: 'hold', name: '보류' },
  { id: 'done', name: '진행완료' },
];
export const statusName = (id) => STATUS.find((s) => s.id === id)?.name || '예정';
const ORDER = { active: 0, planned: 1, hold: 2, done: 3 };

export function itemsOf(p) {
  return Object.entries(p?.items || {})
    .map(([id, it]) => ({ id, ...it }))
    .filter((it) => it.text)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function progressOf(p) {
  const items = itemsOf(p);
  const done = items.filter((it) => it.done).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

// 종료일까지 D-Day
export function endLabel(p) {
  if (p.status === 'done') return '완료';
  if (!p.endDate) return '';
  const n = diffDays(today(), p.endDate);
  if (n === 0) return 'D-Day';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export const sortProjects = (arr) =>
  arr
    .slice()
    .sort(
      (a, b) =>
        (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1) ||
        (a.endDate || '9999').localeCompare(b.endDate || '9999', 'en') ||
        (a.order || 0) - (b.order || 0)
    );

// 달력에 막대로 보여줄 프로젝트 (진행완료 제외, 기간이 있는 것)
export const projectsOn = (projects, date) =>
  projects
    .filter((p) => p.status !== 'done' && p.startDate && p.endDate && p.startDate <= date && date <= p.endDate)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id < b.id ? -1 : 1));
