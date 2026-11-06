// 구글 캘린더 읽기 전용 연결
// - 권한은 calendar.readonly 하나만 요청 → 앱에서 구글 일정을 고치거나 지울 수 없음
// - 접속 토큰(약 1시간 유효)은 메모리에만 보관. 만료되면 버튼 한 번으로 다시 받음
// - 불러온 일정은 이 기기에만 임시 보관(Firestore에 저장하지 않음) → 오프라인·만료 상태에서도 마지막 일정 표시
import { GOOGLE_CLIENT_ID } from './config.js';
import { state } from './state.js';
import { ymd, parse, addDays, today } from './util/date.js';

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const API = 'https://www.googleapis.com/calendar/v3';
const KEY = { linked: 'haru:gcal:linked', cals: 'haru:gcal:cals', events: 'haru:gcal:events', at: 'haru:gcal:at' };

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* 저장 공간 부족 등 → 이번 실행에서만 유지 */
  }
};

export const gcal = {
  configured: !!GOOGLE_CLIENT_ID,
  linked: !!read(KEY.linked, false), // 이 기기에서 한 번이라도 연결했는지
  calendars: read(KEY.cals, []), // [{ id, name, color, primary, selectedInGoogle }]
  byDate: read(KEY.events, {}), // { 'YYYY-MM-DD': [일정, ...] }
  fetchedAt: read(KEY.at, 0),
  status: 'idle', // idle | loading | ok | expired | error
  error: '',
};

const listeners = new Set();
export function onGcal(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((fn) => fn(gcal));

let token = null;
let tokenExp = 0;
let client = null;
let gisPromise = null;
let lastRange = null;
const fetchedRanges = new Map(); // 범위 → 마지막으로 불러온 시각 (짧은 시간 안에 같은 범위 반복 요청 방지)

export const hasToken = () => !!token && Date.now() < tokenExp;
export const eventsOn = (date) => gcal.byDate[date] || [];

function loadGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => {
        gisPromise = null;
        reject(new Error('구글 로그인 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'));
      };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

// 앱 시작 때 미리 불러 두기 (버튼을 눌렀을 때 바로 창이 뜨도록)
export function prepare() {
  if (gcal.configured && navigator.onLine) loadGIS().catch(() => {});
}

// 반드시 버튼을 누른 순간에 호출해야 함 (그래야 브라우저가 로그인 창을 막지 않음)
export function connect() {
  return new Promise((resolve, reject) => {
    if (!gcal.configured) return reject(new Error('구글 캘린더 연결 설정(클라이언트 ID)이 아직 없어요.'));
    const go = () => {
      client ||= window.google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SCOPE, callback: () => {} });
      client.callback = (resp) => {
        if (resp.error) return reject(new Error('연결하지 못했어요: ' + (resp.error_description || resp.error)));
        if (!window.google.accounts.oauth2.hasGrantedAllScopes(resp, SCOPE)) {
          return reject(new Error('"캘린더 보기" 권한을 허용해야 일정을 볼 수 있어요.'));
        }
        token = resp.access_token;
        tokenExp = Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000;
        gcal.linked = true;
        write(KEY.linked, true);
        resolve();
      };
      client.error_callback = (err) => {
        const msg =
          err?.type === 'popup_closed'
            ? '로그인 창이 닫혔어요. 다시 눌러 주세요.'
            : err?.type === 'popup_failed_to_open'
              ? '로그인 창이 막혔어요. 한 번 더 눌러 주세요.'
              : '연결하지 못했어요. 다시 시도해 주세요.';
        reject(new Error(msg));
      };
      client.requestAccessToken({ prompt: '' });
    };
    if (window.google?.accounts?.oauth2) go();
    else loadGIS().then(go, reject);
  });
}

export function disconnect() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
  token = null;
  tokenExp = 0;
  Object.assign(gcal, { linked: false, calendars: [], byDate: {}, fetchedAt: 0, status: 'idle', error: '' });
  Object.values(KEY).forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* 무시 */
    }
  });
  fetchedRanges.clear();
  emit();
}

async function api(path, params = {}) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) {
    token = null;
    throw Object.assign(new Error('연결 시간이 지났어요.'), { expired: true });
  }
  if (!res.ok) throw new Error(`구글 캘린더 응답 오류 (${res.status})`);
  return res.json();
}

async function loadCalendars() {
  const items = [];
  let pageToken;
  do {
    const d = await api('/users/me/calendarList', {
      minAccessRole: 'reader',
      pageToken,
      fields: 'items(id,summary,summaryOverride,backgroundColor,primary,selected),nextPageToken',
    });
    items.push(...(d.items || []));
    pageToken = d.nextPageToken;
  } while (pageToken);
  gcal.calendars = items
    .map((c) => ({
      id: c.id,
      name: c.summaryOverride || c.summary || c.id,
      color: /^#[0-9a-fA-F]{6}$/.test(c.backgroundColor || '') ? c.backgroundColor : '#9AA3B2',
      primary: !!c.primary,
      selectedInGoogle: !!c.selected,
    }))
    .sort((a, b) => Number(b.primary) - Number(a.primary));
  write(KEY.cals, gcal.calendars);
}

// 표시할 캘린더: 직접 고른 목록이 있으면 그것, 없으면 구글에서 체크된 캘린더
export function selectedIds() {
  const chosen = state.settings.gcalCalendars;
  if (Array.isArray(chosen)) return chosen;
  return gcal.calendars.filter((c) => c.primary || c.selectedInGoogle).map((c) => c.id);
}

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function addEvent(out, ev, cal, from, to) {
  if (ev.status === 'cancelled') return;
  const base = { id: ev.id, calId: cal.id, calName: cal.name, title: ev.summary || '(제목 없음)', color: cal.color, link: ev.htmlLink || '', location: ev.location || '' };
  if (ev.start?.date) {
    // 종일 일정 (끝 날짜는 포함하지 않음)
    const end = ev.end?.date || addDays(ev.start.date, 1);
    for (let d = ev.start.date; d < end; d = addDays(d, 1)) {
      if (d >= from && d <= to) (out[d] ||= []).push({ ...base, allDay: true });
    }
  } else if (ev.start?.dateTime) {
    const s = new Date(ev.start.dateTime);
    const e = new Date(ev.end?.dateTime || ev.start.dateTime);
    const sd = ymd(s);
    const ed = e > s ? ymd(new Date(e.getTime() - 1)) : sd;
    for (let d = sd; d <= ed; d = addDays(d, 1)) {
      if (d < from || d > to) continue;
      (out[d] ||= []).push({ ...base, allDay: false, time: d === sd ? hhmm(s) : null, endTime: d === ed ? hhmm(e) : null });
    }
  }
}

const sortEvents = (arr) =>
  arr.sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.time || '00:00').localeCompare(b.time || '00:00', 'en'));

// 오래된 임시 보관 일정 정리 (오늘 기준 앞뒤 120일만 유지)
function prune() {
  const min = addDays(today(), -120);
  const max = addDays(today(), 120);
  for (const d of Object.keys(gcal.byDate)) if (d < min || d > max) delete gcal.byDate[d];
}

// from~to 범위 일정 불러오기
// interactive: 버튼을 눌러 부른 경우 → 토큰이 없으면 로그인 창을 띄움
export async function refresh(from = lastRange?.from, to = lastRange?.to, { interactive = false } = {}) {
  if (!from || !to || !gcal.configured) return;
  lastRange = { from, to };
  const key = from + to + (selectedIds().join(',') || '-');
  if (!interactive && fetchedRanges.has(key) && Date.now() - fetchedRanges.get(key) < 3 * 60 * 1000) return;

  if (!hasToken()) {
    if (!interactive) {
      gcal.status = gcal.linked ? 'expired' : 'idle';
      emit();
      return;
    }
    await connect(); // 버튼을 누른 순간 바로 실행되어야 함
  }

  gcal.status = 'loading';
  emit();
  try {
    if (interactive || !gcal.calendars.length) await loadCalendars();
    const cmap = Object.fromEntries(gcal.calendars.map((c) => [c.id, c]));
    const timeMin = parse(from).toISOString();
    const timeMax = parse(addDays(to, 1)).toISOString();
    const fresh = {};
    for (const id of selectedIds()) {
      if (!cmap[id]) continue;
      let pageToken;
      do {
        const d = await api(`/calendars/${encodeURIComponent(id)}/events`, {
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
          pageToken,
          fields: 'items(id,status,summary,location,htmlLink,start,end),nextPageToken',
        });
        for (const ev of d.items || []) addEvent(fresh, ev, cmap[id], from, to);
        pageToken = d.nextPageToken;
      } while (pageToken);
    }
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (fresh[d]) gcal.byDate[d] = sortEvents(fresh[d]);
      else delete gcal.byDate[d];
    }
    prune();
    gcal.fetchedAt = Date.now();
    gcal.status = 'ok';
    gcal.error = '';
    fetchedRanges.set(key, Date.now());
    write(KEY.events, gcal.byDate);
    write(KEY.at, gcal.fetchedAt);
    emit();
  } catch (e) {
    if (e.expired) gcal.status = 'expired';
    else {
      gcal.status = 'error';
      gcal.error = navigator.onLine ? e.message : '인터넷에 연결되어 있지 않아요.';
    }
    emit();
    if (interactive) throw e;
  }
}

// 버튼에서 부르는 새로고침 (실패하면 메시지를 돌려줌)
export async function refreshByUser(from, to) {
  try {
    await refresh(from, to, { interactive: true });
    return null;
  } catch (e) {
    return e.message;
  }
}

export function lastUpdatedLabel() {
  if (!gcal.fetchedAt) return '';
  const d = new Date(gcal.fetchedAt);
  const sameDay = ymd(d) === ymd(new Date());
  return (sameDay ? '' : `${d.getMonth() + 1}/${d.getDate()} `) + hhmm(d) + ' 기준';
}
