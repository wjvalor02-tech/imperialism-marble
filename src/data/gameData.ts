// src/data/gameData.ts
// '제국주의 마블' 원본 PPT(게임판·국가카드·식민화 카드·황금열쇠)에서 옮긴 게임 데이터.
// 금액 단위: 만원 (예: 35 = 35만원)
// ⚠️ ASSUMPTION 표시가 있는 값은 원본에 명시되지 않아 추정한 값 → 교사 확인 후 수정
// 역사 설명(history)은 원본 카드 문장을 바탕으로 사실관계를 바로잡은 버전

export type PlayerNation = 'UK' | 'FRANCE' | 'GERMANY' | 'USA';

export const NATIONS: Record<PlayerNation, { name: string; color: string; flag: string }> = {
  UK:      { name: '영국',   color: '#C8102E', flag: '🇬🇧' },
  FRANCE:  { name: '프랑스', color: '#0055A4', flag: '🇫🇷' },
  GERMANY: { name: '독일',   color: '#222222', flag: '🇩🇪' },
  USA:     { name: '미국',   color: '#3C3B6E', flag: '🇺🇸' },
};

export const RULES = {
  startingMoney: 350,          // 밸런스 조정: 원본 500만원 → 350만원 (승률 균형, 선택의 긴장감)
  passStartToll: 10,           // 확정: 출발을 지날 때마다(1바퀴마다) 통행료 10만원을 국제은행에 '낸다'
  oneStagePerLap: true,        // 식민지화는 1바퀴 당 1단계씩만
  liberiaSkipTurns: 3,         // 라이베리아: 3턴 동안 이동 불가 (주사위 더블이면 바로 탈출)
  startDevelopLimit: 1,        // 선생님 결정: 출발을 지날 때 내 식민지 중 1곳만 골라 1단계 개발 (0이면 제한 없음)
  colonyIncome: 10,            // 선생님 결정: 출발을 지날 때 보유 식민지 1곳마다 10만원 수입
  doubleRollAgain: true,       // 주사위 2개가 같은 눈(더블)이면 한 번 더 굴림
  // 승리 조건(확정): ① 한 나라만 남으면 즉시 승리
  //                  ② 수업 타이머가 끝나면 식민지 점수 1위 승리 (선생님 결정, docs/rule-decisions.md)
  // 식민지 점수 = 식민지 1곳당 1점 + 진행한 식민화 단계마다 1점 + 파쇼다 점령 3점
  // 동점이면 현금 − 남은 대출이 많은 나라. 그래도 같으면 총자산(현금 + 식민지 투자액 − 대출)
  victoryScore: { perColony: 1, perStage: 1, fashoda: 3 },
  timeLimitMinutes: 30,        // 관리 화면에서 변경 가능, 0이면 타이머 끄기
  diceCount: 2,                // 밸런스 조정: 원본 사진은 주사위 1개 → 30분 안에 광산·특화 시설까지 진행되도록 2개
};

// ── 식민지화 단계 ─────────────────────────────────────────
// level 0 = 매입만 한 상태(무역대금 5만원, 원래 2만원). 이후 1바퀴에 1단계씩 올라감.
export interface Stage { name: string; cost: number; toll: number }

const base = (price: number): Stage[] => [
  { name: '식민지 확보(식민화 전)', cost: price, toll: 5 }, // 밸런스 조정: 2 → 5만원
  { name: '회사 설립', cost: 20, toll: 15 },
  { name: '농장 설립', cost: 30, toll: 25 },
  { name: '광산 개발(1개)', cost: 50, toll: 40 },
  { name: '광산 개발(2개)', cost: 50, toll: 80 }, // 확정: 광산은 2번 개발 가능(각 50만원)
];
const withSpecial = (price: number, name: string, cost: number, toll: number): Stage[] =>
  [...base(price), { name, cost, toll }];

// ── 식민지 데이터 ─────────────────────────────────────────
export interface Colony {
  id: string;
  name: string;
  region: 'africa' | 'asia' | 'oceania';
  price: number;
  stages: Stage[];
  history: string;              // 원본 카드 설명(교사 검토 후 수정 권장)
  historicalRuler: string;      // 실제 역사에서의 지배국 → 게임 후 비교 활동용
  historyNote?: string;         // 세계사 검토 메모(사실관계 보완 포인트)
}

export const COLONIES: Record<string, Colony> = {
  morocco: { id: 'morocco', name: '모로코', region: 'africa', price: 35,
    stages: withSpecial(35, '철광 개발', 70, 130), historicalRuler: '프랑스(일부 에스파냐)',
    history: '1912년 프랑스의 식민지가 되었다. 석유는 없으나 석탄, 철, 납 등 지하자원이 풍부하다.',
    historyNote: '1912년 페스 조약으로 프랑스 보호령(북부는 에스파냐 보호령).' },
  egypt: { id: 'egypt', name: '이집트', region: 'africa', price: 50,
    stages: withSpecial(50, '수에즈 운하 운영', 100, 160), historicalRuler: '영국',
    history: '1882년 영국군에 점령되어 사실상 영국의 지배를 받았고, 1914년 정식으로 영국의 보호국이 되었다. 영국 면직물 공업에 원료를 대는 면화 재배가 경제의 중심이었으며, 수에즈 운하는 전략적, 경제적 요충지 역할을 한다.',
    historyNote: '원본 수정: "석유가 경제의 기반" → 당시 핵심은 면화. 지배 시점 보완(1882 점령, 1914 보호국).' },
  southAfrica: { id: 'southAfrica', name: '남아프리카 연방', region: 'africa', price: 45,
    stages: withSpecial(45, '다이아몬드 광산 개발', 90, 150), historicalRuler: '영국',
    history: '남아프리카 전쟁(1899~1902)에서 승리한 영국이 1910년 영국 자치령인 남아프리카 연방을 세웠다. 광업이 중요산업으로, 다이아몬드 · 금광석 · 석탄 등이 생산된다.',
    historyNote: '남아프리카 전쟁(1899~1902) 후 1910년 영국 자치령 남아프리카 연방 성립.' },
  algeria: { id: 'algeria', name: '알제리', region: 'africa', price: 10,
    stages: withSpecial(10, '광산 개발(3개)', 50, 100), historicalRuler: '프랑스',
    history: '1830년대에 프랑스의 식민지가 되었다. 그 계기는 프랑스 영사 모욕 사건으로 정치적인 이유였다. 당시 알제리는 경제적인 이점은 별로 없었다.' },
  congo: { id: 'congo', name: '콩고', region: 'africa', price: 50,
    stages: withSpecial(50, '고무농장 형성', 80, 140), historicalRuler: '벨기에',
    history: '1885년 베를린 회의 이후 벨기에 국왕 레오폴드 2세의 개인 소유지(콩고 자유국)가 되었고, 1908년 벨기에 정부의 식민지로 넘어갔다. 고무 채취에 원주민을 강제로 동원하는 가혹한 수탈로 국제적 비판을 받았다. 다이아몬드, 구리, 금 등 지하자원도 풍부하다.',
    historyNote: '원본 수정: "1884년 벨기에의 식민지" → 1885년 국왕 사유지, 1908년 벨기에 식민지. 고무 강제노동은 성찰 활동 소재.' },
  libya: { id: 'libya', name: '리비아', region: 'africa', price: 20,
    stages: [ ...base(20).slice(0, 4),
      { name: '농장 2개', cost: 30, toll: 60 },   // ASSUMPTION: 추가 농장 비용 30만원
      { name: '농장 3개', cost: 30, toll: 90 } ],
    historicalRuler: '이탈리아',
    history: '1912년 이탈리아의 식민지가 되었다. 이탈리아는 자국의 농업문제를 해결하기 위해 리비아를 식민지로 삼았다. 올리브, 포도, 담배 등을 경작하였다.' },
  cameroon: { id: 'cameroon', name: '카메룬', region: 'africa', price: 15,
    stages: withSpecial(15, '커피농장 형성', 60, 100), historicalRuler: '독일',
    history: '19세기 말 독일의 식민지가 되었다. 농업이 중심이며, 카카오와 커피가 주로 생산된다. 지하자원으로는 철 등이 있다.' },
  westAfrica: { id: 'westAfrica', name: '서아프리카', region: 'africa', price: 40,
    stages: withSpecial(40, '보크사이트 광산 개발', 90, 150), historicalRuler: '프랑스',
    history: '19세기 말에 형성된 프랑스의 식민지 연방체이다. 현재의 기니, 말리 등으로 구성되어 있었다. 지하자원으로는 보크사이트(알루미늄의 원석) 등이 산출된다.' },
  gabon: { id: 'gabon', name: '가봉', region: 'africa', price: 15,
    stages: withSpecial(15, '고무농장 형성', 80, 140), historicalRuler: '프랑스',
    history: '19세기 말에 프랑스 식민지가 되었다. 석유, 철광석, 금, 다이아몬드 등 지하자원이 풍부하다. 그 외에도 농산물로 코코아, 커피, 고무 등도 산출된다.' },
  india: { id: 'india', name: '인도', region: 'asia', price: 55,
    stages: withSpecial(55, '아편농장 형성', 90, 150), historicalRuler: '영국',
    history: '세포이의 항쟁 이후 1858년부터 영국 정부가 직접 통치하였고, 1877년 빅토리아 여왕이 인도 황제를 겸하면서 인도 제국이 성립하였다. 면화, 아편, 차, 향신료 등을 재배하였다. 오늘날 세계에서 인구가 가장 많은 나라이다.',
    historyNote: '원본 수정: "1877년 식민지" → 1858년 직접 통치, 1877년 인도 제국 성립. "인구 2위" → 2023년 이후 1위.' },
  indochina: { id: 'indochina', name: '인도차이나', region: 'asia', price: 35,
    stages: withSpecial(35, '광산 개발(3개)', 50, 100), historicalRuler: '프랑스',
    history: '19세기 말에 형성된 프랑스의 식민지 연방체이다. 현재의 베트남, 캄보디아, 라오스 등으로 구성되어 있다. 중국과 근접해 있다는 지리적 이점이 있었다.',
    historyNote: '1887년 프랑스령 인도차이나 연방 성립(라오스는 1893년 편입).' },
  myanmar: { id: 'myanmar', name: '미얀마', region: 'asia', price: 20,
    stages: withSpecial(20, '대규모 농경지 개발', 80, 140), historicalRuler: '영국',
    history: '세 차례에 걸친 영국-버마 전쟁 끝에 1886년 전역이 영국령 인도에 편입되었다. 당시 세계 최대 수출용 벼농사 지대로 성장하였다. 벌목도 성행하였으며, 석유나 텅스텐 광석 등도 개발되었다.',
    historyNote: '원본 수정: "1855년" → 1852년 하부 버마 병합, 1886년 전역 병합.' },
  australia: { id: 'australia', name: '오스트레일리아', region: 'oceania', price: 30,
    stages: withSpecial(30, '대규모 목양지 개발', 80, 140), historicalRuler: '영국',
    history: '19세기 영국의 식민지로 개발되었다. 양모 수출이 주력 산업이었으며, 각지에서 금광이 발견되어 세계 각지에서 이민이 증가하였다.' },
  philippines: { id: 'philippines', name: '필리핀', region: 'asia', price: 20,
    stages: withSpecial(20, '담배농장 형성', 80, 140), historicalRuler: '에스파냐 → 미국',
    history: '16~17세기 에스파냐의 식민지가 되었다. 19세기 말에 미국에 양도되었다. 담배, 사탕수수, 커피 등을 재배하는 대농장 경영이 실시되었다.' },
  indonesia: { id: 'indonesia', name: '인도네시아', region: 'asia', price: 45,
    stages: withSpecial(45, '후추농장 형성', 80, 140), historicalRuler: '네덜란드',
    history: '17세기 네덜란드 동인도 회사가 진출한 뒤 1800년부터 네덜란드 정부가 직접 지배하였고, 20세기 초 아체 지역까지 정복하여 지배를 완성하였다. 커피, 사탕수수 등을 강제로 재배하게 하는 강제 재배 제도가 실시되었다. 특히 후추는 세계 공급량의 절반 이상을 차지하였다.',
    historyNote: '원본 수정: "1904년 식민지" → 17세기 진출·1800년 정부 직할, 1904년 무렵은 전역 지배 완성 시점.' },
  newZealand: { id: 'newZealand', name: '뉴질랜드', region: 'oceania', price: 30,
    stages: withSpecial(30, '대규모 목양지 개발', 80, 140), historicalRuler: '영국',
    history: '19세기 영국의 식민지로 개발되었다. 농업과 목축업이 발달하였다. 목재와 석탄 등의 자원도 풍부하였다.',
    historyNote: '1840년 와이탕이 조약.' },
  marshall: { id: 'marshall', name: '마셜제도', region: 'oceania', price: 15,
    stages: withSpecial(15, '코코넛농장 개발', 80, 140), historicalRuler: '독일',
    history: '19세기 후반 독일의 식민지가 되었다. 독일 정부의 주요 관심은 코코넛의 과육과 코프라(야자씨를 말린 것, 과자·마가린 등에 쓰인다) 무역에 있었다.' },
  caroline: { id: 'caroline', name: '캐롤라인제도', region: 'oceania', price: 20,
    stages: withSpecial(20, '보크사이트 광산 개발', 90, 150), historicalRuler: '에스파냐 → 독일',
    history: '1899년 독일의 식민지가 되었다. 코코넛, 사탕수수 등을 재배하며, 보크사이트(알루미늄의 원석) 등의 지하자원도 산출된다.' },
};

// ── 게임판 (24칸, 출발에서 시계방향) ─────────────────────
export type Tile =
  | { kind: 'start' }
  | { kind: 'colony'; colonyId: keyof typeof COLONIES }
  | { kind: 'ethiopia' }   // 커피교역 값 50만원 납부
  | { kind: 'siam' }       // 가장 가까운 자신의 식민지로 이동
  | { kind: 'liberia' }    // 3턴 이동 불가
  | { kind: 'china' }      // 중국 공동 식민통치기구에 20만원 납부
  | { kind: 'fashoda' };   // 영국 1회 점령 기회(프랑스에 200만원), 그 외 황금열쇠

export const BOARD: Tile[] = [
  { kind: 'start' },                                  // 0  좌하단 모서리
  { kind: 'colony', colonyId: 'morocco' },            // 1  좌측 변(아래→위)
  { kind: 'colony', colonyId: 'egypt' },              // 2
  { kind: 'colony', colonyId: 'southAfrica' },        // 3
  { kind: 'colony', colonyId: 'algeria' },            // 4
  { kind: 'colony', colonyId: 'congo' },              // 5
  { kind: 'ethiopia' },                               // 6  좌상단 모서리
  { kind: 'colony', colonyId: 'libya' },              // 7  상단 변(왼→오)
  { kind: 'colony', colonyId: 'cameroon' },           // 8
  { kind: 'fashoda' },                                // 9
  { kind: 'colony', colonyId: 'westAfrica' },         // 10
  { kind: 'colony', colonyId: 'gabon' },              // 11
  { kind: 'siam' },                                   // 12 우상단 모서리
  { kind: 'colony', colonyId: 'india' },              // 13 우측 변(위→아래)
  { kind: 'colony', colonyId: 'indochina' },          // 14
  { kind: 'colony', colonyId: 'myanmar' },            // 15
  { kind: 'colony', colonyId: 'indonesia' },          // 16 (오스트레일리아와 교환: 아시아끼리 묶음)
  { kind: 'colony', colonyId: 'philippines' },        // 17
  { kind: 'liberia' },                                // 18 우하단 모서리
  { kind: 'colony', colonyId: 'australia' },          // 19 하단 변(오→왼) — 오세아니아끼리 묶음
  { kind: 'colony', colonyId: 'newZealand' },         // 20
  { kind: 'china' },                                  // 21
  { kind: 'colony', colonyId: 'marshall' },           // 22
  { kind: 'colony', colonyId: 'caroline' },           // 23
];

export const SPECIAL_TILES = {
  ethiopia: { name: '에티오피아', fee: 50, text: '커피의 나라. 커피교역 값으로 50만원을 납부한다.',
    historyNote: '아두와 전투(1896)에서 이탈리아를 물리치고 독립 유지.' },
  siam: { name: '시암(타이)', text: '아시아에서 독립을 유지한 국가. 여기서 가장 가까운 자신의 식민지로 이동한다.',
    historyNote: '영국·프랑스 세력 사이의 완충국, 라마 5세(쭐랄롱꼰)의 근대화 개혁.' },
  liberia: { name: '라이베리아', skipTurns: 3, text: '3턴 동안 움직일 수 없다. (차례마다 주사위를 굴려 더블이 나오면 바로 벗어날 수 있다.)',
    historyNote: '미국 해방 노예 이주로 세워진 공화국(1847 독립 선언), 아프리카에서 독립 유지.' },
  china: { name: '중국의 반식민지화', fee: 20, text: '중국 공동 식민통치기구에 20만원을 납부하고, 황금열쇠를 뽑는다.', // 조정: 황금열쇠 칸 추가
    historyNote: '열강의 조차지·세력권 분할, 의화단 운동 이후 신축 조약(1901).' },
  fashoda: { name: '파쇼다 사건', price: 200, toll: 50, // 밸런스 조정: 100 → 50 (영국 승률 52% 완화)
    text: '게임 중 단 1회에 한해 영국이 파쇼다를 점령할 기회를 부여한다. 단, 프랑스에 200만원을 지불한다. 그 외의 경우에는 황금열쇠 칸으로 이용한다. (영국이 점령한 뒤에는 다른 나라가 영국에 대금을 내고 황금열쇠를 뽑는다.)',
    historyNote: '1898년 종단 정책(영국)과 횡단 정책(프랑스)의 충돌, 프랑스 양보 → 1904년 영·프 협상.' },
} as const;

// ── 황금열쇠 (13장) ───────────────────────────────────────
// 선생님 결정(조정 8): 식민지 매각 카드 삭제, 대출 500 → 200만원, 착취 강화는 식민지 수에 비례,
// 저항 운동 2장·문호 개방·베를린 회의 추가
export type GoldenKeyEffect =
  | 'WAR'            // 전쟁: 원하는 식민지 탈취 시도 (200만원)
  | 'SABOTAGE'       // 적국 식민지 중요시설 파괴 (100만원) → 단계 1 하락으로 구현
  | 'EXPLOIT'        // 착취 강화: 내 식민지 1곳마다 perColony만원
  | 'TOLL_EXEMPT'    // 적국 식민지 무역대금 1회 면제
  | 'DEFENSE'        // 방어 카드 (사용 시 200만원)
  | 'ALLIANCE'       // 동맹 2바퀴, 무역대금 반분
  | 'LOAN'           // 대출, 1바퀴마다 50만원 상환
  | 'RESISTANCE'     // 저항 운동: 뽑은 나라의 가장 많이 개발된 식민지 1단계 후퇴
  | 'OPEN_DOOR'      // 문호 개방: 중국 공동 식민통치기구 적립금을 모두 받음
  | 'BERLIN';        // 베를린 회의: 주인 없는 아프리카 식민지 1곳을 가격대로 바로 확보 (보관)

export interface GoldenKey { id: string; effect: GoldenKeyEffect; text: string; cost?: number; gain?: number;
  perColony?: number; // 식민지 1곳당 얻는 돈 (착취 강화)
  reflect?: string;   // 카드를 뽑은 뒤 보여 줄 성찰 한 줄
  holdable: boolean } // holdable: 뽑은 뒤 보관했다가 나중에 사용 가능 여부

export const GOLDEN_KEYS: GoldenKey[] = [
  { id: 'gk1',  effect: 'WAR',         cost: 200, holdable: true,  text: '원하는 지역을 식민지로 확보하기 위해 전쟁을 일으킬 수 있다. 단, 전쟁 비용으로 200만원을 지불해야 한다.' },
  { id: 'gk2',  effect: 'WAR',         cost: 200, holdable: true,  text: '원하는 지역을 식민지로 확보하기 위해 전쟁을 일으킬 수 있다. 단, 전쟁 비용으로 200만원을 지불해야 한다.' },
  { id: 'gk4',  effect: 'SABOTAGE',    cost: 100, holdable: true,  text: '적국 식민지의 중요시설을 파괴한다. 단, 전쟁 비용으로 100만원을 지불해야 한다.' },
  { id: 'gk5',  effect: 'EXPLOIT',     perColony: 30, holdable: false, text: '식민지의 착취 강도를 두 배 높인다. 내 식민지 1곳마다 30만원을 확보한다.',
    reflect: '실제로는 강제노동·세금 강화로 현지인의 삶이 악화되었다.' },
  { id: 'gk6',  effect: 'TOLL_EXEMPT',            holdable: true,  text: '적국 식민지에 무역대금을 지불하지 않을 수 있다.' },
  { id: 'gk7',  effect: 'DEFENSE',     cost: 200, holdable: true,  text: '적국의 공격을 방어한다. 단, 전쟁 비용으로 200만원을 지불해야 한다.' },
  { id: 'gk8',  effect: 'DEFENSE',     cost: 200, holdable: true,  text: '적국의 공격을 방어한다. 단, 전쟁 비용으로 200만원을 지불해야 한다.' },
  { id: 'gk9',  effect: 'ALLIANCE',               holdable: true,  text: '특정 적국과 동맹을 맺을 수 있다. 단, 동맹기간은 2바퀴로 제한한다. (동맹은 거절될 수 있으며, 동맹 기간 중 무역대금은 반으로 나눈다.)' },
  { id: 'gk10', effect: 'LOAN',        gain: 200, holdable: false, text: '국제은행으로부터 200만원의 자금을 대출받을 수 있다. 단, 대출받은 자금은 1바퀴마다 50만원씩 상환해야 한다.' },
  { id: 'gk11', effect: 'RESISTANCE',             holdable: false, text: '마지마지 봉기(1905, 독일령 동아프리카)·의화단 운동(1899, 중국)처럼 식민지 사람들이 지배에 맞서 일어났다. 내 식민지 중 가장 많이 개발된 곳의 식민화가 1단계 후퇴한다.',
    reflect: '식민지 사람들은 가만히 있지 않았다. 저항은 아프리카·아시아 곳곳에서 일어났다.' },
  { id: 'gk12', effect: 'RESISTANCE',             holdable: false, text: '세포이 항쟁(1857, 인도)·사모리 투레의 저항(1880~90년대, 서아프리카)처럼 식민지 사람들이 지배에 맞서 일어났다. 내 식민지 중 가장 많이 개발된 곳의 식민화가 1단계 후퇴한다.',
    reflect: '식민지 사람들은 가만히 있지 않았다. 저항은 아프리카·아시아 곳곳에서 일어났다.' },
  { id: 'gk13', effect: 'OPEN_DOOR',              holdable: false, text: '미국의 문호 개방 선언(1899): 중국에서 모든 열강이 똑같이 무역할 권리를 요구했다. 중국 공동 식민통치기구 적립금을 모두 받는다.',
    reflect: '열강이 \'공평하게\' 나누자고 한 것은 중국의 이권이었다. 중국 사람들의 뜻은 묻지 않았다.' },
  { id: 'gk14', effect: 'BERLIN',                 holdable: true,  text: '베를린 회의(1884~85): 유럽 열강이 아프리카 분할의 규칙을 정했다. 주인 없는 아프리카 식민지 1곳을 골라 확보 가격을 내고 바로 확보할 수 있다.',
    reflect: '아프리카의 운명을 정한 이 회의에 아프리카 사람은 한 명도 초대받지 못했다.' },
];
