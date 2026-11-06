// 아직 만들지 않은 화면 (플래너: 3단계, 프로젝트: 4단계)
import { icons } from '../components/icons.js';

export function placeholder(title, stage, desc, icon) {
  return {
    mount(root) {
      root.innerHTML = `<div class="page-scroll">
        <h1 class="page-title">${title}</h1>
        <div class="list soon">
          <div class="soon-icon">${icons[icon]}</div>
          <p><b>아직 만들지 않은 화면이에요 (${stage}단계 예정)</b></p>
          <p class="hint">${desc}</p>
        </div>
      </div>`;
      return () => {};
    },
  };
}
