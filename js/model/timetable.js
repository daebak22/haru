// 타임테이블 계산: 06:00 ~ 다음 날 05:59, 1시간 = 10분 칸 6개, 총 144칸
// 칸 번호 = (시 − 6, 0~5시는 +24) × 6 + (분 ÷ 10)
import { ymd, parse, addDays } from '../util/date.js';

export const TT_START = 6; // 타임테이블 시작 시각
export const CELLS = 144;
const SLOT = 10 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

export const hourOfRow = (r) => (r + TT_START) % 24;
export const indexOf = (h, m) => ((h - TT_START + 24) % 24) * 6 + Math.floor(m / 10);

export function labelOf(i) {
  const h = (Math.floor(i / 6) + TT_START) % 24;
  return `${pad(h)}:${pad((i % 6) * 10)}`;
}
export const endLabelOf = (i) => labelOf((i + 1) % CELLS);

// 칠한 칸 → 총 시간, 카테고리별 시간 (분)
export function totals(cells) {
  const by = {};
  let total = 0;
  for (const c of Object.values(cells || {})) {
    if (!c) continue;
    by[c] = (by[c] || 0) + 10;
    total += 10;
  }
  return { total, by };
}

export function fmtMin(m) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}분`;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}

// 실제 시각(ms)이 속한 플래너 날짜와 칸 번호 (06:00 전은 전날)
export function slotOf(ms) {
  const d = new Date(ms);
  return { date: ymd(new Date(ms - TT_START * 3600e3)), index: indexOf(d.getHours(), d.getMinutes()) };
}

// 시각 범위 → 칠할 칸 { 날짜: [칸 번호...] }. 10분 칸 중 5분 이상 걸친 칸만
export function cellsForRange(start, end) {
  const out = {};
  for (let s = Math.floor(start / SLOT) * SLOT; s < end; s += SLOT) {
    const overlap = Math.min(end, s + SLOT) - Math.max(start, s);
    if (overlap >= 5 * 60 * 1000) {
      const { date, index } = slotOf(s);
      (out[date] ||= []).push(index);
    }
  }
  return out;
}

// 시각 범위를 플래너 날짜(06:00 경계)별로 나누기
export function splitByDay(start, end) {
  const parts = [];
  let s = start;
  while (s < end) {
    const { date } = slotOf(s);
    const boundary = parse(addDays(date, 1)).getTime() + TT_START * 3600e3;
    const e = Math.min(end, boundary);
    parts.push({ date, start: s, end: e });
    s = e;
  }
  return parts;
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export const hhmmOf = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
