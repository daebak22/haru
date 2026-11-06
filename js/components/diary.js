// 하루 한 줄 일기 + 대표 이모지 (날짜 문서 days/{날짜}의 diary, emoji)
// 글자는 입력을 멈추고 0.8초 뒤 또는 칸을 벗어날 때 저장 → 쓰기 횟수 절약
import * as store from '../store/index.js';
import { esc } from '../util/dom.js';
import { relLabel } from '../util/date.js';
import { openSheet } from './sheet.js';

export const EMOJIS = ['😊', '😄', '🥰', '😌', '🙂', '😐', '😴', '😢', '😭', '😤', '😡', '🤒', '🔥', '💪', '📚', '✍️', '🏃', '🎉', '☕', '🌧️', '☀️', '🍀', '💤', '✨'];
const MAX = 100;

export function diaryHTML(date, dayDoc) {
  const emoji = dayDoc?.emoji || '';
  const text = dayDoc?.diary || '';
  const title = relLabel(date) === '오늘' ? '오늘의 한 줄' : '이 날의 한 줄';
  return `<section class="section diary-sec">
    <h2 class="section-title"><span><i class="en">DIARY</i>${title}</span></h2>
    <div class="diary">
      <button type="button" class="emo-btn${emoji ? '' : ' empty'}" data-act="emoji" data-date="${date}" aria-label="대표 이모지 고르기">${emoji ? esc(emoji) : '🙂'}</button>
      <input class="diary-input" data-diary data-date="${date}" data-keep="diary-${date}" maxlength="${MAX}" value="${esc(text)}" placeholder="오늘 하루를 한 줄로 남겨 보세요" enterkeyhint="done" aria-label="한 줄 일기">
    </div>
  </section>`;
}

function save(date, value) {
  const v = value.trim().slice(0, MAX);
  store.patch('days', date, { date, diary: v || store.DEL });
}

// 입력칸 동작 연결 (root 안의 모든 일기 칸)
export function bindDiary(root) {
  const timers = {};
  const flush = (el) => {
    const date = el.dataset.date;
    clearTimeout(timers[date]);
    delete timers[date];
    if ((el.dataset.saved ?? el.defaultValue) !== el.value) {
      el.dataset.saved = el.value;
      save(date, el.value);
    }
  };
  const onInput = (e) => {
    const el = e.target.closest('[data-diary]');
    if (!el) return;
    clearTimeout(timers[el.dataset.date]);
    timers[el.dataset.date] = setTimeout(() => flush(el), 800);
  };
  const onBlur = (e) => {
    const el = e.target.closest?.('[data-diary]');
    if (el) flush(el);
  };
  const onKey = (e) => {
    const el = e.target.closest?.('[data-diary]');
    if (el && e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
  };
  root.addEventListener('input', onInput);
  root.addEventListener('focusout', onBlur);
  root.addEventListener('keydown', onKey);
  return () => {
    // 화면을 떠날 때 저장 안 된 글자가 있으면 저장
    root.querySelectorAll('[data-diary]').forEach((el) => timers[el.dataset.date] && flush(el));
    root.removeEventListener('input', onInput);
    root.removeEventListener('focusout', onBlur);
    root.removeEventListener('keydown', onKey);
  };
}

export function openEmojiPicker(date, current = '') {
  openSheet({
    title: '대표 이모지',
    body: `<div class="emoji-grid">${EMOJIS.map((e) => `<button type="button" class="emoji-pick${e === current ? ' on' : ''}" data-emo="${e}">${e}</button>`).join('')}</div>
      <form class="row-inline emoji-custom" data-custom autocomplete="off">
        <input class="input" name="emo" placeholder="직접 입력 (키보드 이모지)" maxlength="16" aria-label="이모지 직접 입력">
        <button type="submit" class="btn soft">선택</button>
      </form>`,
    footer: `${current ? '<button type="button" class="btn danger" data-clear>지우기</button>' : ''}<span class="spacer"></span><button type="button" class="btn ghost" data-close>닫기</button>`,
    onMount(el, close) {
      const pick = (emo) => {
        store.patch('days', date, { date, emoji: emo || store.DEL });
        close();
      };
      el.querySelector('.emoji-grid').addEventListener('click', (e) => {
        const b = e.target.closest('[data-emo]');
        if (b) pick(b.dataset.emo);
      });
      el.querySelector('[data-custom]').addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = e.target.elements.emo.value.trim();
        if (!raw) return;
        // 글자 하나(이모지 하나)만 사용
        const first = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(raw)][0]?.segment : [...raw][0];
        pick(first);
      });
      el.querySelector('[data-clear]')?.addEventListener('click', () => pick(null));
    },
  });
}
