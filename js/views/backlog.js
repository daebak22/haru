// 보관함: 날짜 없는 할 일
import * as store from '../store/index.js';
import { onState } from '../state.js';
import { today } from '../util/date.js';
import { frame, setHTML } from '../util/dom.js';
import { icons } from '../components/icons.js';
import { sortTasks, taskRowHTML } from '../components/rows.js';
import { openMenu } from '../components/sheet.js';
import { openTaskEditor } from '../components/taskEditor.js';
import { toggleTask, moveTask, deleteTask } from '../components/taskActions.js';

export function mount(root) {
  let tasks = [];

  const render = frame(() => {
    const list = sortTasks(tasks).sort((a, b) => Number(a.done) - Number(b.done));
    setHTML(
      root,
      `<div class="page-scroll" data-scroll="backlog">
        <header class="page-head">
          <a class="icon-btn" href="#more" aria-label="뒤로">${icons.left}</a>
          <h1>보관함</h1>
        </header>
        <p class="hint">언젠가 할 일, 날짜를 아직 못 정한 일을 모아 두는 곳이에요.</p>
        <div class="list">${
          list.length ? list.map((x) => taskRowHTML(x)).join('') : '<p class="empty">보관함이 비어 있어요.</p>'
        }</div>
      </div>
      <button type="button" class="fab" data-act="add" aria-label="보관함에 추가">${icons.plus}</button>`
    );
  });

  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const task = tasks.find((x) => x.id === el.closest('[data-id]')?.dataset.id);
    switch (el.dataset.act) {
      case 'add':
        openTaskEditor({ date: null });
        break;
      case 'toggle':
        if (task) toggleTask(task);
        break;
      case 'edit':
        if (task) openTaskEditor({ task });
        break;
      case 'menu':
        if (!task) break;
        openMenu(task.title, [
          { label: '오늘 하기', icon: 'today', onClick: () => moveTask(task, today(), '오늘 할 일로 옮겼어요') },
          { label: '날짜 정하기 / 수정', icon: 'edit', onClick: () => openTaskEditor({ task }) },
          { label: '삭제', icon: 'trash', danger: true, onClick: () => deleteTask(task) },
        ]);
        break;
    }
  };
  root.addEventListener('click', onClick);

  const unsubs = [
    store.watch('tasks', { field: 'date', eq: null }, (d) => {
      tasks = d;
      render();
    }),
    onState(render),
    () => root.removeEventListener('click', onClick),
  ];
  render();
  return () => unsubs.forEach((u) => u());
}
