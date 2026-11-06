// 화면 전환 (#today, #calendar, #planner ...)과 하단 탭/왼쪽 메뉴
import { icons } from './components/icons.js';
import { isWide, onLayoutChange } from './util/layout.js';

const routes = {};
const TABS = [
  { id: 'today', label: '오늘', wideLabel: '홈', icon: 'today', wideIcon: 'home' },
  { id: 'calendar', label: '달력', icon: 'calendar', phoneOnly: true },
  { id: 'planner', label: '플래너', icon: 'planner' },
  { id: 'projects', label: '프로젝트', icon: 'projects' },
  { id: 'more', label: '더보기', icon: 'more' },
];
const PARENT = { backlog: 'more', routines: 'more', categories: 'more', quotes: 'more', gcal: 'more' };

let cleanup = null;
const main = () => document.getElementById('main');

export function register(name, view) {
  routes[name] = view;
}

function currentRoute() {
  let name = location.hash.slice(1).split('/')[0] || 'today';
  if (!routes[name]) name = 'today';
  if (name === 'calendar' && isWide()) name = 'today'; // 태블릿은 홈에 달력이 함께 있음
  return name;
}

function renderNav(active) {
  const wide = isWide();
  const tab = PARENT[active] || active;
  document.getElementById('nav').innerHTML = TABS.filter((t) => !(wide && t.phoneOnly))
    .map((t) => {
      const icon = icons[(wide && t.wideIcon) || t.icon];
      const label = (wide && t.wideLabel) || t.label;
      return `<a href="#${t.id}" ${t.id === tab ? 'aria-current="page"' : ''}><span class="ic">${icon}</span><span>${label}</span></a>`;
    })
    .join('');
}

export function render() {
  const name = currentRoute();
  cleanup?.();
  cleanup = null;
  const root = main();
  root.innerHTML = '';
  root.className = 'main';
  window.scrollTo(0, 0);
  renderNav(name);
  cleanup = routes[name].mount(root) || null;
}

export function start() {
  window.addEventListener('hashchange', render);
  onLayoutChange(render);
  render();
}
