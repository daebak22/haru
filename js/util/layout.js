// 태블릿 가로(폭 900px 이상 + 가로 방향)인지 판단
const mq = matchMedia('(min-width: 900px) and (orientation: landscape)');

export const isWide = () => mq.matches;
export const onLayoutChange = (fn) => mq.addEventListener('change', fn);
