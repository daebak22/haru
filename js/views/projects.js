// 프로젝트: 상태별 목록 + 상세(세부 체크리스트, 진행률, 연결된 할 일, 메모)
// 폰: 목록(#projects) → 누르면 상세(#projects/아이디). 태블릿 가로: 왼쪽 목록 + 오른쪽 상세
import * as store from '../store/index.js';
import { state, onState } from '../state.js';
import { today, fmtShort } from '../util/date.js';
import { isWide } from '../util/layout.js';
import { esc, frame, setHTML, safeColor, vibrate } from '../util/dom.js';
import { STATUS, statusName, itemsOf, progressOf, endLabel, sortProjects } from '../model/project.js';
import { icons } from '../components/icons.js';
import { openMenu, openSheet, whenSheetsClosed } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { sortTasks, taskRowHTML } from '../components/rows.js';
import { toggleTask, openTaskMenu } from '../components/taskActions.js';
import { openTaskEditor } from '../components/taskEditor.js';
import { openProjectEditor } from '../components/projectEditor.js';

let filter = 'all';

const period = (p) => (p.startDate || p.endDate ? `${p.startDate ? fmtShort(p.startDate) : ''} – ${p.endDate ? fmtShort(p.endDate) : ''}` : '기간 없음');

function cardHTML(p, selected) {
  const pr = progressOf(p);
  const dl = endLabel(p);
  return `<a class="pcard${selected ? ' selected' : ''}${p.status === 'done' ? ' is-done' : ''}" href="#projects/${encodeURIComponent(p.id)}" style="--c:${safeColor(p.color)}">
    <div class="pcard-top"><span class="pname">${esc(p.name)}</span>${dl ? `<b class="pdday">${dl}</b>` : ''}</div>
    <div class="pmeta"><span class="pstatus s-${esc(p.status)}">${statusName(p.status)}</span><span>${period(p)}</span></div>
    <div class="pbar"><i style="width:${pr.pct}%"></i></div>
    <div class="pmeta"><span>${pr.total ? `세부 항목 ${pr.done}/${pr.total}` : '세부 항목 없음'}</span><b>${pr.pct}%</b></div>
  </a>`;
}

function listHTML(selectedId) {
  const all = sortProjects(state.projects);
  const count = (s) => all.filter((p) => s === 'all' || p.status === s).length;
  const shown = all.filter((p) => filter === 'all' || p.status === filter);
  return `<div class="chips pfilter">${[['all', '전체'], ...STATUS.map((s) => [s.id, s.name])]
    .map(([id, name]) => `<button type="button" class="chip" data-pf="${id}" aria-pressed="${filter === id}">${name} ${count(id)}</button>`)
    .join('')}</div>
    <div class="plist">${
      shown.length
        ? shown.map((p) => cardHTML(p, p.id === selectedId)).join('')
        : `<div class="list"><p class="empty">${all.length ? '이 상태의 프로젝트가 없어요.' : '아직 프로젝트가 없어요.<br><b>+</b> 버튼으로 만들어 보세요.'}</p></div>`
    }</div>`;
}

function detailHTML(p, tasks, { back }) {
  if (!p) return `<div class="list soon"><div class="soon-icon">${icons.projects}</div><p class="hint">왼쪽에서 프로젝트를 고르거나 새로 만들어 보세요.</p></div>`;
  const pr = progressOf(p);
  const items = itemsOf(p);
  const linked = sortTasks(tasks).sort((a, b) => Number(a.done) - Number(b.done));
  return `
    ${back ? `<header class="page-head"><a class="icon-btn" href="#projects" aria-label="목록으로">${icons.left}</a><h1>프로젝트</h1></header>` : ''}
    <div class="pdetail" style="--c:${safeColor(p.color)}">
      <div class="pcard-top"><span class="pname big">${esc(p.name)}</span>
        <button type="button" class="icon-btn" data-act="p-edit" aria-label="프로젝트 수정">${icons.edit}</button></div>
      <div class="pmeta"><button type="button" class="pstatus s-${esc(p.status)}" data-act="p-status">${statusName(p.status)} ▾</button><span>${period(p)}</span>${endLabel(p) ? `<b class="pdday">${endLabel(p)}</b>` : ''}</div>
      <div class="pbar big"><i style="width:${pr.pct}%"></i></div>
      <div class="pmeta"><span>${pr.total ? `${pr.done} / ${pr.total} 완료` : '세부 항목을 추가하면 진행률이 계산돼요'}</span><b>${pr.pct}%</b></div>
    </div>

    <section class="section">
      <h2 class="section-title"><span><i class="en">CHECKLIST</i>세부 체크리스트${items.length ? `<span class="count">${pr.done}/${pr.total}</span>` : ''}</span></h2>
      <div class="list">${items
        .map(
          (it) => `<div class="row${it.done ? ' done' : ''}" data-iid="${esc(it.id)}">
            <button type="button" class="check" data-act="i-toggle" style="--c:${safeColor(p.color)}" aria-pressed="${!!it.done}" aria-label="${it.done ? '완료 취소' : '완료로 표시'}"><span class="box">${icons.check}</span></button>
            <div class="row-body" data-act="i-menu"><div class="row-title">${esc(it.text)}</div></div>
            <button type="button" class="icon-btn" data-act="i-menu" aria-label="항목 메뉴">${icons.dots}</button>
          </div>`
        )
        .join('')}
        <form class="add-item" data-additem autocomplete="off">
          <span class="plus">${icons.plus}</span>
          <input class="add-input" name="text" placeholder="세부 항목 추가 (예: 자기소개서 초안)" maxlength="100" enterkeyhint="done" aria-label="세부 항목 추가">
          <button type="submit" class="btn small soft">추가</button>
        </form>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title"><span><i class="en">TASKS</i>연결된 할 일${linked.length ? `<span class="count">${linked.filter((x) => x.done).length}/${linked.length}</span>` : ''}</span>
        <button type="button" class="btn small soft" data-act="p-addtask">${icons.plus} 할 일</button></h2>
      <div class="list">${linked.length ? linked.map((x) => taskRowHTML(x, { showDate: true })).join('') : '<p class="empty small">할 일을 만들 때 프로젝트를 고르면 여기 모여요.</p>'}</div>
    </section>

    ${p.memo ? `<section class="section"><h2 class="section-title"><span><i class="en">MEMO</i>메모</span></h2><div class="list memo-box">${esc(p.memo).replace(/\n/g, '<br>')}</div></section>` : ''}
  `;
}

export function mount(root, { params = [] } = {}) {
  const wide = isWide();
  let selectedId = params[0] || null;
  let tasks = [];
  let unsubT = null;

  function watchTasks() {
    unsubT?.();
    tasks = [];
    if (!selectedId) return;
    unsubT = store.watch('tasks', { field: 'projectId', eq: selectedId }, (d) => {
      tasks = d;
      render();
    });
  }

  const render = frame(() => {
    if (wide && !selectedId) {
      const first = sortProjects(state.projects).find((p) => filter === 'all' || p.status === filter);
      if (first) {
        selectedId = first.id;
        watchTasks();
      }
    }
    const p = selectedId ? state.projectMap[selectedId] : null;
    // 입력 중인 세부 항목 글자와 커서 유지
    const inp = root.querySelector('[data-additem] input');
    const typed = inp?.value || '';
    const focused = document.activeElement === inp;
    const fab = `<button type="button" class="fab" data-act="p-new" aria-label="새 프로젝트">${icons.plus}</button>`;
    if (wide) {
      setHTML(
        root,
        `<div class="split"><section class="pane" data-scroll="pl"><h1 class="page-title">프로젝트</h1>${listHTML(selectedId)}</section>
         <section class="pane" data-scroll="pd">${detailHTML(p, tasks, { back: false })}</section></div>${fab}`
      );
    } else if (selectedId) {
      setHTML(root, `<div class="page-scroll">${p ? detailHTML(p, tasks, { back: true }) : '<p class="empty">프로젝트를 찾을 수 없어요.</p>'}</div>`);
    } else {
      setHTML(root, `<div class="page-scroll"><h1 class="page-title">프로젝트</h1>${listHTML(null)}</div>${fab}`);
    }
    const ni = root.querySelector('[data-additem] input');
    if (ni && typed) ni.value = typed;
    if (ni && focused) ni.focus();
  });

  const project = () => state.projectMap[selectedId];

  const onClick = (e) => {
    const pf = e.target.closest('[data-pf]');
    if (pf) {
      filter = pf.dataset.pf;
      if (wide) selectedId = null;
      render();
      return;
    }
    // 태블릿: 목록 카드를 누르면 주소 이동 없이 오른쪽에 표시
    const card = e.target.closest('.pcard');
    if (card && wide) {
      e.preventDefault();
      selectedId = decodeURIComponent(card.getAttribute('href').split('/')[1]);
      watchTasks();
      render();
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const p = project();
    const iid = el.closest('[data-iid]')?.dataset.iid;
    const task = tasks.find((x) => x.id === el.closest('[data-id]')?.dataset.id);
    switch (el.dataset.act) {
      case 'p-new':
        openProjectEditor(null, {
          onSaved: (id) => {
            selectedId = id;
            if (wide) {
              watchTasks();
              render();
            } else whenSheetsClosed(() => (location.hash = `#projects/${encodeURIComponent(id)}`));
          },
        });
        break;
      case 'p-edit':
        if (p) {
          openProjectEditor(p, {
            onDeleted: () => {
              if (wide) {
                selectedId = null;
                watchTasks();
                render();
              } else whenSheetsClosed(() => (location.hash = '#projects'));
            },
          });
        }
        break;
      case 'p-status':
        if (!p) break;
        openMenu('상태 바꾸기', STATUS.map((s) => ({ label: s.name + (s.id === p.status ? ' ✓' : ''), onClick: () => store.patch('projects', p.id, { status: s.id }) })));
        break;
      case 'p-addtask':
        if (p) openTaskEditor({ date: today(), projectId: p.id });
        break;
      case 'i-toggle': {
        if (!p || !iid) break;
        const done = !p.items?.[iid]?.done;
        store.patch('projects', p.id, { items: { [iid]: { done } } });
        if (done) vibrate(12);
        const pr = progressOf({ ...p, items: { ...p.items, [iid]: { ...p.items[iid], done } } });
        if (done && pr.total && pr.done === pr.total) toast('세부 항목을 모두 끝냈어요! 상태를 "진행완료"로 바꿀까요?', { action: '바꾸기', onAction: () => store.patch('projects', p.id, { status: 'done' }) });
        break;
      }
      case 'i-menu': {
        if (!p || !iid) break;
        const it = p.items[iid];
        openMenu(it.text, [
          { label: '이름 고치기', icon: 'edit', onClick: () => editItem(p, iid) },
          {
            label: '삭제',
            icon: 'trash',
            danger: true,
            onClick: () => {
              store.patch('projects', p.id, { items: { [iid]: store.DEL } });
              toast('항목을 지웠어요', { action: '되돌리기', onAction: () => store.patch('projects', p.id, { items: { [iid]: it } }) });
            },
          },
        ]);
        break;
      }
      case 'toggle':
        if (task) toggleTask(task);
        break;
      case 'edit':
        if (task) openTaskEditor({ task });
        break;
      case 'menu':
        if (task) openTaskMenu(task);
        break;
    }
  };

  const onSubmit = (e) => {
    const form = e.target.closest('[data-additem]');
    if (!form) return;
    e.preventDefault();
    const p = project();
    const text = form.elements.text.value.trim();
    if (!p || !text) return;
    store.patch('projects', p.id, { items: { [store.newId()]: { text, done: false, order: Date.now() } } });
    form.elements.text.value = '';
    form.elements.text.focus();
  };

  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  const unState = onState(render);
  watchTasks();
  render();
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('submit', onSubmit);
    unState();
    unsubT?.();
  };
}

function editItem(p, iid) {
  const it = p.items[iid];
  openSheet({
    title: '세부 항목 고치기',
    body: `<form class="form" id="item-form" autocomplete="off"><input class="input" name="text" maxlength="100" value="${esc(it.text)}" aria-label="세부 항목"></form>`,
    footer: `<span class="spacer"></span><button type="button" class="btn ghost" data-close>취소</button><button type="submit" form="item-form" class="btn primary">저장</button>`,
    onMount(el, close) {
      const f = el.querySelector('#item-form');
      f.elements.text.focus();
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = f.elements.text.value.trim();
        if (text) store.patch('projects', p.id, { items: { [iid]: { text } } });
        close();
      });
    },
  });
}
