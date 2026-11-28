import type { PlayerNation } from '../data/gameData';

export type PlayerId = PlayerNation;
/** 금전 이동의 주체: 플레이어, 국제은행, 중국 공동 식민통치기구 */
export type Account = PlayerId | 'BANK' | 'CHINA_POOL';

export interface Settings {
  startingMoney: number;
  passStartToll: number;
  timeLimitMinutes: number; // 0이면 타이머 끔
  sellRatio: number; // 식민지 매각가 = 투자액 × sellRatio
  quizEnabled: boolean;
  loanRepayment: number; // 출발 통과 때마다 상환액
  diceCount: number; // 주사위 개수 (1 또는 2)
  developOnPassStart: boolean; // 출발을 지날 때 내 식민지를 1단계 개발할 수 있음
  startDevelopLimit: number; // 출발 통과 개발에서 고를 수 있는 식민지 수 (0 = 제한 없음)
  colonyIncome: number; // 출발을 지날 때 보유 식민지 1곳마다 받는 돈
  randomOrder: boolean; // 게임 시작 때 차례 순서를 추첨
  doubleRollAgain: boolean; // 주사위 2개가 더블이면 한 번 더
}

export interface PlayerState {
  id: PlayerId;
  money: number;
  position: number;
  lap: number; // 출발을 지난 횟수
  skipTurns: number; // 라이베리아 남은 턴
  loan: number; // 남은 대출 원금
  heldCards: string[];
  bankrupt: boolean;
  tollReceived: number; // 받은 무역대금 총액 (성찰 활동용)
  tollPaid: number;
}

export interface ColonyState {
  owner: PlayerId | null;
  stage: number; // stages 배열의 인덱스 (0 = 확보만 한 상태)
  invested: number; // 확보 가격 + 진행한 식민화 비용 합계
  lastDevelopedLap: number; // 마지막으로 확보/개발한 소유국의 바퀴 수
  earned: number; // 이 식민지에서 거둔 무역대금 누계
  everOwned: PlayerId[];
}

export interface Alliance {
  a: PlayerId; // 제안국 (기간 기준)
  b: PlayerId;
  endLap: number; // a의 lap이 이 값에 도달하면 종료
}

export interface Charge {
  to: Account;
  amount: number;
  reason: string;
  loanRepay?: boolean;
  colonyId?: string; // 무역대금이면 식민지 id 또는 'fashoda'
}

/** 결정이 끝난 뒤 이어서 할 일 */
export type Continuation = 'END_TURN' | 'RESOLVE_TILE' | 'SIAM_JUMP' | 'RESUME' | 'START_DEV' | 'DRAW_KEY';

export type NoticeTone = 'info' | 'good' | 'bad' | 'history' | 'reflect';

export type Pending =
  | { type: 'BUY'; colonyId: string }
  | { type: 'DEVELOP'; colonyId: string }
  | { type: 'START_DEVELOP'; colonyIds: string[]; then: Continuation } // 출발 통과: 개발할 식민지 고르기
  | { type: 'PAY_TOLL'; colonyId: string; owner: PlayerId; amount: number; baseAmount: number; allied: boolean; then?: Continuation } // then: 낸 뒤 할 일 (기본 차례 끝)
  | { type: 'FASHODA_OFFER' }
  | {
      type: 'NOTICE';
      tone: NoticeTone;
      icon?: string;
      title: string;
      lines: string[];
      note?: string; // 역사 메모·성찰 메모
      minMs?: number; // 최소 표시 시간 (역사 카드)
      charges?: Charge[]; // 확인 시 납부
      then: Continuation;
    }
  | { type: 'KEY_DRAWN'; cardId: string; kept: boolean; result?: string } // result: 바로 쓰인 카드의 결과 한 줄
  | { type: 'KEY_CHOICE'; cardIds: [string, string] }
  | { type: 'QUIZ'; quizId: string }
  | { type: 'DEFENSE_PROMPT'; attacker: PlayerId; defender: PlayerId; colonyId: string }
  | { type: 'ALLIANCE_PROMPT'; from: PlayerId; to: PlayerId }
  | { type: 'DEBT'; debtor: PlayerId; charges: Charge[]; then: Continuation };

export type Phase = 'SETUP' | 'PLAYING' | 'GAME_OVER' | 'REFLECTION';

export type LogKind = 'money' | 'event' | 'key' | 'host' | 'turn';

export interface LogEntry {
  id: number;
  turn: number;
  kind: LogKind;
  text: string;
  player?: PlayerId;
  from?: Account;
  to?: Account;
  amount?: number;
  secret?: boolean; // 황금열쇠 내용이 드러나는 기록 → 공개 화면(최근 사건)에서는 숨김
}

export interface RankRow {
  id: PlayerId;
  cash: number;
  investment: number;
  loan: number;
  total: number; // 총자산 = 현금 + 투자액 − 대출
  colonies: number; // 식민지 수 (파쇼다 제외)
  stages: number; // 식민화 단계 합
  fashoda: boolean;
  score: number; // 식민지 점수 (승리 기준)
  bankrupt: boolean;
}

export interface GameState {
  version: 1;
  phase: Phase;
  settings: Settings;
  players: PlayerState[]; // 차례 순서
  currentIdx: number;
  turn: number;
  colonies: Record<string, ColonyState>;
  fashoda: { owner: PlayerId | null; occupied: boolean };
  deck: string[]; // 뽑을 더미 (끝에서 뽑음)
  discard: string[];
  chinaPool: number;
  alliances: Alliance[];
  pending: Pending | null;
  lastRoll: number[];
  move: { seq: number; player: PlayerId | null; from: number; path: number[]; kind: 'dice' | 'jump'; passes?: number };
  rngSeed: number;
  log: LogEntry[];
  logSeq: number;
  timeUp: boolean;
  bankruptOrder: PlayerId[];
  bonusRoll?: boolean; // 이번 굴림이 더블 → 차례를 마치면 같은 나라가 한 번 더
  extraTurn?: boolean; // 지금 차례가 더블로 얻은 추가 굴림인지 (화면 안내용)
  ranking?: RankRow[];
  winner?: PlayerId;
  endReason?: 'LAST_STANDING' | 'TIME_UP';
}

export type Action =
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_COLONY' }
  | { type: 'DEVELOP_COLONY' }
  | { type: 'DEVELOP_MANY'; colonyIds: string[] } // 출발 통과 시 일괄 개발 (빈 배열 = 개발 안 함)
  | { type: 'SKIP' }
  | { type: 'ACK' }
  | { type: 'PAY_TOLL'; useExempt: boolean }
  | { type: 'FASHODA'; accept: boolean }
  | { type: 'ANSWER_QUIZ'; answer: boolean }
  | { type: 'CHOOSE_KEY'; cardId: string }
  | { type: 'USE_KEY'; cardId: string; targetColonyId?: string; targetPlayer?: PlayerId }
  | { type: 'RESPOND_DEFENSE'; defend: boolean }
  | { type: 'RESPOND_ALLIANCE'; accept: boolean }
  | { type: 'SELL_FOR_DEBT'; colonyId: string }
  | { type: 'PAY_DEBT' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'LIBERIA_WAIT' }
  | { type: 'TIME_UP' }
  | { type: 'GO_REFLECTION' }
  | { type: 'HOST_ADJUST_MONEY'; player: PlayerId; delta: number; reason: string }
  | { type: 'HOST_SET_OWNER'; colonyId: string; owner: PlayerId | null; reason: string }
  | { type: 'HOST_SET_STAGE'; colonyId: string; stage: number; reason: string }
  | { type: 'HOST_SETTINGS'; settings: Partial<Settings> };
