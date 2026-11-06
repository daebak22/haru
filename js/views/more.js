// 더보기: 보관함·루틴·카테고리, 화면 설정, 백업
import { state, onState, updateSettings } from '../state.js';
import { VERSION } from '../config.js';
import { frame, setHTML, esc } from '../util/dom.js';
import { icons } from '../components/icons.js';
import { openSheet, confirmBox } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { exportBackup, parseBackup, applyBackup } from '../backup.js';
import { gcal } from '../gcal.js';

const seg = (key, options, cur) =>
  `<div class="seg" data-set="${key}">${options
    .map(([v, label]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${label}</button>`)
    .join('')}</div>`;

function openImportSheet(parsed, fileName) {
  const c = (k) => parsed.data[k]?.length || 0;
  const when = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('ko-KR') : '알 수 없음';
  const body = `
    <p class="confirm-msg"><b>${esc(fileName)}</b><br>내보낸 때: ${esc(when)}</p>
    <ul class="count-list">
      <li>할 일 <b>${c('tasks')}</b></li><li>루틴 <b>${c('routines')}</b></li>
      <li>카테고리 <b>${c('categories')}</b></li><li>날짜 기록 <b>${c('days')}</b></li>
      <li>프로젝트 <b>${c('projects')}</b></li>
    </ul>
    <div class="choice">
      <button type="button" class="menu-item" data-mode="merge"><span class="mi">${icons.download}</span><span class="grow"><b>합치기 (추천)</b><small>지금 데이터는 그대로 두고, 파일의 내용 중 더 최근 것만 반영해요.</small></span></button>
      <button type="button" class="menu-item danger" data-mode="replace"><span class="mi">${icons.trash}</span><span class="grow"><b>전부 바꾸기</b><small>지금 이 기기의 데이터를 모두 지우고 파일 내용으로 바꿔요.</small></span></button>
    </div>`;
  openSheet({
    title: '백업 불러오기',
    body,
    onMount(el, close) {
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        const mode = b.dataset.mode;
        if (mode === 'replace') {
          const ok = await confirmBox('지금 데이터가 모두 지워지고 백업 파일 내용으로 바뀌어요. 계속할까요?', { ok: '전부 바꾸기', danger: true });
          if (!ok) return;
        }
        try {
          const n = await applyBackup(parsed, mode);
          close();
          toast(mode === 'replace' ? '백업 파일로 모두 바꿨어요' : `합치기 완료: ${n}개 반영`);
        } catch (err) {
          toast('불러오기 실패: ' + err.message);
        }
      });
    },
  });
}

export function mount(root) {
  const render = frame(() => {
    const s = state.settings;
    const favCount = Object.keys(s.favQuotes || {}).length;
    const termCount = Object.keys(s.favTerms || {}).length;
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="more">
        <h1 class="page-title">더보기</h1>
        <div class="list">
          <a class="menu-item" href="#backlog"><span class="mi">${icons.inbox}</span><span class="grow">보관함<small>날짜 없는 할 일</small></span><span class="chev">${icons.right}</span></a>
          <a class="menu-item" href="#routines"><span class="mi">${icons.repeat}</span><span class="grow">루틴<small>매일 · 매주 · 매월 반복</small></span><span class="chev">${icons.right}</span></a>
          <a class="menu-item" href="#categories"><span class="mi">${icons.tag}</span><span class="grow">카테고리<small>추가하고 색상 정하기</small></span><span class="chev">${icons.right}</span></a>
          <a class="menu-item" href="#quotes"><span class="mi">${icons.heart}</span><span class="grow">저장함<small>문장 ${favCount} · 부동산금융 용어 ${termCount}</small></span><span class="chev">${icons.right}</span></a>
          <a class="menu-item" href="#gcal"><span class="mi">${icons.calendar}</span><span class="grow">구글 캘린더<small>${gcal.linked ? '연결됨 · 표시할 캘린더 고르기' : '일정을 읽기 전용으로 함께 보기'}</small></span><span class="chev">${icons.right}</span></a>
        </div>

        <h2 class="section-title"><span>화면</span></h2>
        <div class="list">
          <div class="setting"><span>테마</span>${seg('theme', [['system', '시스템'], ['light', '밝게'], ['dark', '어둡게']], s.theme)}</div>
          <div class="setting"><span>한 주 시작</span>${seg('weekStart', [[1, '월요일'], [0, '일요일']], s.weekStart)}</div>
          <label class="setting"><span>오늘의 한 문장<br><small class="muted">오늘 화면에 동기부여 문장 보이기</small></span><input type="checkbox" class="switch" data-toggle="showQuote" ${s.showQuote !== false ? 'checked' : ''}></label>
          <label class="setting"><span>오늘의 부동산금융 용어<br><small class="muted">오늘 화면 아래에 용어 하나 보이기</small></span><input type="checkbox" class="switch" data-toggle="showTerm" ${s.showTerm !== false ? 'checked' : ''}></label>
        </div>

        <h2 class="section-title"><span>데이터</span></h2>
        <div class="list">
          <button type="button" class="menu-item" data-act="export"><span class="mi">${icons.download}</span><span class="grow">백업 파일 내보내기<small>전체 데이터를 JSON 파일로 저장</small></span></button>
          <button type="button" class="menu-item" data-act="import"><span class="mi">${icons.upload}</span><span class="grow">백업 파일 불러오기<small>내보낸 JSON 파일에서 복원</small></span></button>
        </div>
        <p class="hint">지금은 데이터가 <b>이 기기의 브라우저에만</b> 저장돼요. 5단계에서 구글 계정 동기화를 연결하면 폰과 태블릿이 자동으로 맞춰져요. 그 전까지는 가끔 백업 파일을 내보내 두세요.</p>
        <input type="file" accept=".json,application/json" hidden data-file>
        <p class="app-ver">하루 · 버전 ${VERSION}</p>
      </div>`
    );
  });

  const onClick = async (e) => {
    const segBtn = e.target.closest('[data-set] [data-v]');
    if (segBtn) {
      const key = segBtn.closest('[data-set]').dataset.set;
      const v = segBtn.dataset.v;
      updateSettings({ [key]: key === 'weekStart' ? Number(v) : v });
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'export') {
      try {
        await exportBackup();
        toast('백업 파일을 저장했어요 (다운로드 폴더)');
      } catch (err) {
        toast('내보내기 실패: ' + err.message);
      }
    }
    if (el.dataset.act === 'import') root.querySelector('[data-file]').click();
  };
  const onChange = async (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      updateSettings({ [toggle.dataset.toggle]: toggle.checked });
      return;
    }
    const input = e.target.closest('[data-file]');
    if (!input || !input.files[0]) return;
    const file = input.files[0];
    input.value = '';
    try {
      const parsed = parseBackup(await file.text());
      openImportSheet(parsed, file.name);
    } catch (err) {
      toast(err.message);
    }
  };
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  const unState = onState(render);
  render();
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    unState();
  };
}
