// 오늘의 부동산금융 용어 (부동산금융 기초 지식)
// 설명은 이 앱에서 직접 쉽게 정리했다. id는 저장(♥) 기록에 쓰이므로 바꾸거나 재사용하지 않는다.
import { diffDays } from '../util/date.js';

export const TERMS = [
  { id: 'pf', term: 'PF (프로젝트 파이낸싱)', en: 'Project Financing', desc: '사업주의 신용이나 담보 대신, 개발 사업이 앞으로 벌어들일 현금흐름(분양대금·임대료)을 상환 재원으로 삼아 돈을 빌려주는 방식. 국내 부동산 개발 자금 조달의 핵심이다.' },
  { id: 'ltv', term: 'LTV (담보인정비율)', en: 'Loan to Value', desc: '담보 가치 대비 대출금의 비율. 감정가 100억 원 건물에 60억 원을 빌리면 LTV 60%. 낮을수록 돈을 빌려준 쪽(대주)이 안전하다.' },
  { id: 'noi', term: 'NOI (순영업소득)', en: 'Net Operating Income', desc: '임대수입 등 총수입에서 공실 손실과 운영비(관리비·재산세·보험료 등)를 뺀 금액. 이자·감가상각·법인세는 빼지 않는다. 수익형 부동산 가치 평가의 출발점.' },
  { id: 'cap', term: 'Cap Rate (자본환원율)', en: 'Capitalization Rate', desc: 'NOI ÷ 부동산 가격. 거꾸로 가격 = NOI ÷ Cap Rate로 가치를 추정한다. Cap Rate가 낮다는 건 시장이 그 자산을 안전하고 인기 있다고 보고 비싸게 산다는 뜻.' },
  { id: 'bridge', term: '브릿지론', en: 'Bridge Loan', desc: '본PF를 받기 전에 토지 매입 등 초기 자금을 마련하는 단기·고금리 대출. 인허가 후 본PF로 갈아타 갚는 구조라, 본PF 전환이 막히면 부실 위험이 커진다.' },
  { id: 'dscr', term: 'DSCR (부채상환비율)', en: 'Debt Service Coverage Ratio', desc: '순영업소득(NOI) ÷ 연간 원리금 상환액. 1.0보다 크면 임대 수입만으로 이자와 원금을 갚을 수 있다는 뜻이다. 대출 심사에서는 보통 1.2~1.3 이상을 요구한다.' },
  { id: 'irr', term: 'IRR (내부수익률)', en: 'Internal Rate of Return', desc: '투자 기간 동안의 현금 유입·유출의 현재가치 합을 0으로 만드는 할인율. 돈이 언제 들어오고 나가는지까지 반영한 연평균 수익률로, 투자 판단의 대표 지표.' },
  { id: 'reits', term: '리츠', en: 'REITs, Real Estate Investment Trusts', desc: '여러 투자자의 돈을 모아 부동산에 투자하고 임대수익·매각차익을 배당하는 회사. 국내는 부동산투자회사법을 따르며, 상장 리츠는 주식처럼 사고팔 수 있다.' },
  { id: 'tranche', term: '선순위·중순위·후순위 (트랜치)', en: 'Senior / Mezzanine / Junior Tranche', desc: '같은 사업에 돈을 빌려줄 때 갚는 순서를 나눈 것. 선순위는 먼저 상환받아 안전한 대신 금리가 낮고, 후순위는 위험한 대신 금리가 높다.' },
  { id: 'completion', term: '책임준공', en: 'Completion Guarantee', desc: '시공사가 공사비를 제때 받지 못하더라도 정해진 기한까지 건물을 완공하겠다고 약속하는 것. 못 지키면 손해배상이나 채무인수 책임을 진다. PF 대주단이 중요하게 보는 신용보강.' },
  { id: 'equity', term: '에쿼티 (자기자본)', en: 'Equity', desc: '사업주·투자자가 직접 넣는 지분 자금. 대출보다 늦게 회수하는 대신, 빚을 갚고 남은 사업 이익을 가져간다.' },
  { id: 'mezz', term: '메자닌', en: 'Mezzanine', desc: '선순위 대출과 지분(에쿼티) 사이에 있는 자금. 후순위 대출, 전환사채 등이 해당하며 위험과 수익이 중간 수준이다. 이탈리아어로 건물 1층과 2층 사이의 "중간층"이라는 뜻.' },
  { id: 'leverage', term: '레버리지', en: 'Leverage', desc: '빌린 돈을 활용해 자기자본 수익률을 높이는 것. 가격이 오르면 수익이 커지지만, 금리가 오르거나 가격이 떨어지면 손실도 크게 불어난다.' },
  { id: 'eod', term: 'EOD (기한이익상실)', en: 'Event of Default', desc: '이자 미납, 담보비율 위반 같은 대출 약정 위반이 생겨, 대주가 만기 전이라도 대출금을 즉시 갚으라고 요구할 수 있게 되는 상태.' },
  { id: 'refi', term: '리파이낸싱', en: 'Refinancing', desc: '기존 대출을 새 대출로 갚는 것. 금리를 낮추거나 만기를 늘리려고, 또는 브릿지론을 본PF로 바꿀 때 쓴다.' },
  { id: 'abcp', term: 'ABCP·ABSTB', en: 'Asset-Backed Commercial Paper / Short-Term Bond', desc: 'PF 대출채권 같은 자산을 기초로 발행하는 단기 기업어음·전자단기사채. 만기가 짧아 계속 다시 발행(차환)해야 하는데, 시장이 얼어붙어 차환이 막히면 유동성 위기로 번질 수 있다.' },
  { id: 'securitization', term: '유동화', en: 'Securitization', desc: '바로 팔기 어려운 자산(대출채권, 미래 분양대금 등)을 증권으로 바꿔 투자자에게 팔고 자금을 미리 확보하는 것. 보통 SPC를 거친다.' },
  { id: 'spc', term: 'SPC (특수목적회사)', en: 'Special Purpose Company', desc: '특정 사업이나 유동화만을 위해 만든 서류상 회사. 사업 위험을 모회사와 분리(도산절연)하기 위해 쓴다. PF·리츠·펀드 구조에 자주 등장한다.' },
  { id: 'developer', term: '시행사·시공사', en: 'Developer / Contractor', desc: '시행사는 땅을 사고 인허가를 받아 사업 전체를 기획·책임지는 주체, 시공사는 건물을 실제로 짓는 건설회사. 국내 시행사는 자본이 작아 시공사 보증과 PF에 크게 기댄다.' },
  { id: 'trust-borrow', term: '차입형 토지신탁', en: 'Development Trust (Borrowing Type)', desc: '신탁사가 토지를 맡아 사업을 직접 시행하고, 사업비도 신탁사가 조달하는 방식. 신탁사가 자금 위험을 지는 대신 보수가 높다.' },
  { id: 'trust-mgmt', term: '관리형 토지신탁 (책임준공확약형)', en: 'Management-type Land Trust', desc: '형식상 시행은 신탁사가 맡지만 자금 조달은 시행사·대주가 하는 방식. 책임준공확약형은 시공사가 책임준공을 못 하면 신탁사가 대신 완공 책임을 진다.' },
  { id: 'syndication', term: '대주단·신디케이션', en: 'Lender Group / Syndicated Loan', desc: '큰 금액을 여러 금융기관이 함께 나눠 빌려주는 것이 신디케이티드 론, 함께 빌려준 금융기관 모임이 대주단이다. 큰 PF는 대부분 대주단을 꾸린다.' },
  { id: 'selldown', term: '셀다운', en: 'Sell-down', desc: '증권사 등이 자산이나 대출을 먼저 통째로 인수한 뒤, 일부를 다른 투자자에게 다시 파는 것. 셀다운이 안 되면 인수한 회사가 그대로 떠안는다.' },
  { id: 'commitment', term: '매입확약·대출확약', en: 'Purchase / Loan Commitment', desc: '유동화증권이 팔리지 않거나 차환이 막히면 증권사 등이 대신 사 주거나 빌려주겠다는 약속. 신용을 보강하지만, 시장이 얼어붙으면 확약한 회사로 위험이 몰린다.' },
  { id: 'credit-enh', term: '신용보강', en: 'Credit Enhancement', desc: '사업 자체의 신용이 부족할 때 시공사 보증, 책임준공, 매입확약, 신탁 등으로 상환 가능성을 높여 주는 장치.' },
  { id: 'presale', term: '분양률', en: 'Pre-sale Rate', desc: '분양 물량 중 계약된 비율. 개발 PF는 분양대금으로 대출을 갚기 때문에, 분양률은 사업성과 대주 안전성을 가르는 핵심 지표다.' },
  { id: 'vacancy', term: '공실률', en: 'Vacancy Rate', desc: '전체 임대 가능 면적 중 비어 있는 면적의 비율. 오피스·상가의 NOI와 가치에 직접 영향을 준다.' },
  { id: 'rentfree', term: '렌트프리', en: 'Rent-free', desc: '임차인을 끌어오기 위해 계약 기간 중 일정 기간 임대료를 받지 않는 것. 명목 임대료는 유지돼 보여도 실질 임대료는 낮아진다.' },
  { id: 'strategy', term: '코어·밸류애드·오퍼튜니스틱', en: 'Core / Value-add / Opportunistic', desc: '부동산 투자 전략 구분. 코어는 안정적인 자산에 낮은 위험·수익, 밸류애드는 리모델링·임차인 교체로 가치를 올리는 중위험, 오퍼튜니스틱은 개발·부실자산 등 고위험·고수익.' },
  { id: 'exit', term: '엑시트', en: 'Exit', desc: '투자금을 회수하는 것. 부동산은 보통 매각, 리츠 편입, 리파이낸싱 등으로 엑시트한다. 투자 단계부터 엑시트 전략을 함께 세운다.' },
  { id: 'appraisal', term: '감정평가 3방식', en: 'Appraisal Approaches', desc: '부동산 가치를 구하는 세 가지 방법. 비슷한 거래 사례와 비교하는 비교방식, 다시 짓는 비용으로 보는 원가방식, 벌어들일 수익으로 보는 수익방식(수익환원법).' },
  { id: 'dcf', term: 'DCF (현금흐름할인법)', en: 'Discounted Cash Flow', desc: '미래 현금흐름을 적정 할인율로 현재가치로 바꿔 더하는 가치 평가법. 부동산에서는 보유 기간의 NOI와 마지막 매각가를 할인해 더한다.' },
  { id: 'nav', term: 'NAV (순자산가치)', en: 'Net Asset Value', desc: '자산 가치에서 부채를 뺀 값. 상장 리츠 주가가 주당 NAV보다 낮으면 "할인돼 거래된다"고 한다.' },
  { id: 'em', term: '에쿼티 멀티플', en: 'Equity Multiple', desc: '총 회수 금액 ÷ 투자한 자기자본. 2.0배면 넣은 돈의 두 배를 돌려받았다는 뜻. 기간을 반영하지 않아 IRR과 함께 본다.' },
  { id: 'dsr', term: 'DSR (총부채원리금상환비율)', en: 'Debt Service Ratio', desc: '개인이 가진 모든 대출의 연간 원리금 ÷ 연소득. 가계대출 규제의 핵심 지표로, 주택 수요와 거래량에 큰 영향을 준다.' },
  { id: 'dti', term: 'DTI (총부채상환비율)', en: 'Debt to Income', desc: '주택담보대출 원리금과 기타 대출 이자를 더해 연소득으로 나눈 비율. 기타 대출은 이자만 보기 때문에 DSR보다 좁은 개념이다.' },
  { id: 'cofix', term: 'COFIX (자금조달비용지수)', en: 'Cost of Funds Index', desc: '은행들이 예금·채권 등으로 돈을 모을 때 드는 평균 비용을 지수로 만든 것. 주택담보대출 변동금리의 기준으로 많이 쓰인다.' },
  { id: 'spread', term: '가산금리 (스프레드)', en: 'Spread', desc: '기준금리(CD금리, 국고채 금리 등) 위에 신용위험·사업위험을 반영해 더하는 금리. 위험한 사업일수록 스프레드가 커진다.' },
  { id: 'irs', term: '금리스왑 (IRS)', en: 'Interest Rate Swap', desc: '변동금리와 고정금리를 서로 바꿔 지급하는 계약. 변동금리로 돈을 빌린 사업이 금리 상승 위험을 줄이려고 쓴다.' },
  { id: 'jeonse', term: '전세가율', en: 'Jeonse-to-Price Ratio', desc: '매매가격 대비 전세가격의 비율. 높을수록 적은 돈으로 집을 사는 갭투자가 쉬워지지만, 집값이 떨어지면 보증금을 돌려주지 못할 위험도 커진다.' },
  { id: 'fund', term: '부동산펀드', en: 'Real Estate Fund', desc: '자본시장법상 집합투자기구로, 자산운용사가 투자자 돈을 모아 부동산이나 부동산 대출에 투자한다. 회사 형태인 리츠와 달리 펀드 형태다.' },
  { id: 'debt-equity', term: '대출형 vs 지분형 투자', en: 'Debt vs Equity Investment', desc: '대출형(데트)은 정해진 이자를 받고 순위에 따라 안전성이 달라지고, 지분형(에쿼티)은 소유자로서 이익과 손실을 함께 진다. 부동산금융 면접 단골 질문.' },
];

const byId = Object.fromEntries(TERMS.map((t) => [t.id, t]));
export const termById = (id) => byId[id] || null;

// 날짜마다 정해진 용어 하나 (폰·태블릿에서 같은 날엔 같은 용어)
export function termIndexFor(date) {
  const n = diffDays('2026-01-01', date);
  return ((n % TERMS.length) + TERMS.length) % TERMS.length;
}
