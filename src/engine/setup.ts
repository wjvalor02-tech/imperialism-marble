import { COLONIES, GOLDEN_KEYS, NATIONS, RULES } from '../data/gameData';
import { shuffle } from './rng';
import type { ColonyState, GameState, PlayerId, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  startingMoney: RULES.startingMoney,
  passStartToll: RULES.passStartToll,
  timeLimitMinutes: RULES.timeLimitMinutes,
  sellRatio: 0.5, // ASSUMPTION(가이드 4-2 #3): 투자액의 50%
  quizEnabled: false,
  loanRepayment: 50,
  diceCount: RULES.diceCount,
  developOnPassStart: true, // 밸런스 조정: 30분 안에 식민화가 진행되도록
  startDevelopLimit: RULES.startDevelopLimit,
  colonyIncome: RULES.colonyIncome,
  randomOrder: false, // 설정 화면에서 켬(기본 켬). 엔진 기본은 꺼서 테스트·시뮬레이션의 나라 순서를 고정
  doubleRollAgain: RULES.doubleRollAgain,
};

export function emptyColony(): ColonyState {
  return { owner: null, stage: 0, invested: 0, lastDevelopedLap: -1, earned: 0, everOwned: [] };
}

export function createGame(nations: PlayerId[], settings: Partial<Settings> = {}, seed = Date.now()): GameState {
  const st: Settings = { ...DEFAULT_SETTINGS, ...settings };
  const s: GameState = {
    version: 1,
    phase: 'PLAYING',
    settings: st,
    players: nations.map((id) => ({
      id, money: st.startingMoney, position: 0, lap: 0, skipTurns: 0, loan: 0,
      heldCards: [], bankrupt: false, tollReceived: 0, tollPaid: 0,
    })),
    currentIdx: 0,
    turn: 1,
    colonies: Object.fromEntries(Object.keys(COLONIES).map((id) => [id, emptyColony()])),
    fashoda: { owner: null, occupied: false },
    deck: [],
    discard: [],
    chinaPool: 0,
    alliances: [],
    pending: null,
    lastRoll: [],
    move: { seq: 0, player: null, from: 0, path: [], kind: 'dice' },
    rngSeed: seed | 0,
    log: [],
    logSeq: 0,
    timeUp: false,
    bankruptOrder: [],
  };
  s.deck = shuffle(s, GOLDEN_KEYS.map((k) => k.id));
  if (st.randomOrder && s.players.length > 1) {
    s.players = shuffle(s, s.players);
    const order = s.players.map((p) => NATIONS[p.id].name).join(' → ');
    s.logSeq += 1;
    s.log.push({ id: s.logSeq, turn: 1, kind: 'event', text: `🎲 차례 순서 추첨: ${order}` });
    s.pending = {
      type: 'NOTICE', tone: 'info', icon: '🎲', title: '차례 순서 추첨 결과',
      lines: s.players.map((p, i) => `${i + 1}번째: ${NATIONS[p.id].name}`), then: 'RESUME',
    };
  }
  return s;
}
