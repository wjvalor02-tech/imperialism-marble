// 개발 규칙·자금 공급 방식에 따른 게임 양상 비교. 실행: npx tsx scripts/simulate-economy.ts
// 4개국 모두 싱글모드 AI. 자금 공급(출발 보너스·식민지 수입)은 시뮬레이션 안에서만 흉내 낸다
// (출발을 지나 바퀴 수가 오를 때 돈을 더해 줌). 엔진의 식민지 수입(colonyIncome)은 꺼 두고 비교한다.
import { COLONIES } from '../src/data/gameData';
import { chooseAiAction } from '../src/engine/ai';
import { reduce } from '../src/engine/reducer';
import { actorOf, computeRanking, getPlayer } from '../src/engine/selectors';
import { createGame } from '../src/engine/setup';
import type { Action, GameState, PlayerId } from '../src/engine/types';

declare const process: { env: Record<string, string | undefined> };
const GAMES = Number(process.env.GAMES ?? 400);
const ALL: PlayerId[] = ['UK', 'FRANCE', 'GERMANY', 'USA'];

// PROFILE=student: 학생처럼 여유 자금 15만원만 남기고 확보·개발 (AI 기본은 60만원을 남김)
const STUDENT = process.env.PROFILE === 'student';
function studentAction(s: GameState, me: PlayerId, r: () => number): Action {
  const pd = s.pending;
  const p = getPlayer(s, me);
  const RES = 15;
  const next = (id: string) => COLONIES[id].stages[s.colonies[id].stage + 1].cost;
  if (pd?.type === 'BUY') return p.money - COLONIES[pd.colonyId].price >= RES ? { type: 'BUY_COLONY' } : { type: 'SKIP' };
  if (pd?.type === 'DEVELOP') return p.money - next(pd.colonyId) >= RES ? { type: 'DEVELOP_COLONY' } : { type: 'SKIP' };
  if (pd?.type === 'START_DEVELOP') {
    let left = p.money - RES;
    return { type: 'DEVELOP_MANY', colonyIds: pd.colonyIds.filter((id) => { if (left < next(id)) return false; left -= next(id); return true; }) };
  }
  return chooseAiAction(s, me, r);
}

interface Economy { key: string; label: string; perLap: (s: GameState, id: PlayerId) => number }
const owned = (s: GameState, id: PlayerId) => Object.keys(s.colonies).filter((c) => s.colonies[c].owner === id);
const ECON: Economy[] = [
  { key: 'E0', label: '지금: 출발 지나면 10만원 냄', perLap: () => 0 },
  { key: 'E1', label: '출발 지나면 10만원 받음', perLap: () => 20 }, // 엔진이 10을 걷으니 +20
  { key: 'E2', label: '출발 지나면 30만원 받음', perLap: () => 40 },
  { key: 'E3', label: '10만원 냄 + 식민지마다 10만원 수입', perLap: (s, id) => owned(s, id).length * 10 },
  { key: 'E4', label: '10만원 냄 + 식민지마다 지금 무역대금만큼 수입', perLap: (s, id) =>
      owned(s, id).reduce((n, c) => n + COLONIES[c].stages[s.colonies[c].stage].toll, 0) },
];

interface Stat { bank: number; anyBank: number; firstBankTurn: number[]; debts: number; endCash: number; alive: number;
  stage: number; mine: number; cols: number; wins: Record<string, number>; lastStanding: number; poorTurns: number; turns: number }

type DevMode = 'all' | 'one' | 'landing';
const DEV_LABEL: Record<DevMode, string> = { all: '출발 일괄', one: '출발 1곳', landing: '도착해야' };
function run(dev: DevMode, e: Economy, maxTurns: number): Stat {
  const st: Stat = { bank: 0, anyBank: 0, firstBankTurn: [], debts: 0, endCash: 0, alive: 0, stage: 0, mine: 0, cols: 0, wins: {}, lastStanding: 0, poorTurns: 0, turns: 0 };
  for (let g = 0; g < GAMES; g++) {
    let seed = g * 7919 + 17;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let s = createGame(ALL, { developOnPassStart: dev !== 'landing', startDevelopLimit: dev === 'all' ? 0 : 1, colonyIncome: 0 }, g + 1);
    let guard = 0;
    let lastTurn = s.turn;
    let first = -1;
    while (s.phase === 'PLAYING' && s.turn <= maxTurns && guard++ < 40000) {
      const laps = Object.fromEntries(s.players.map((p) => [p.id, p.lap]));
      const wasDebt = s.pending?.type === 'DEBT';
      let a = STUDENT ? studentAction(s, actorOf(s), r) : chooseAiAction(s, actorOf(s), r);
      if (dev === 'one' && a.type === 'DEVELOP_MANY') a = { ...a, colonyIds: a.colonyIds.slice(0, 1) }; // 출발 통과 시 1곳만
      const n = reduce(s, a);
      if (n === s) throw new Error(`stuck: ${s.pending?.type}`);
      s = n;
      if (!wasDebt && s.pending?.type === 'DEBT') st.debts++;
      for (const p of s.players) {
        const d = p.lap - laps[p.id];
        if (d > 0 && !p.bankrupt) { const add = e.perLap(s, p.id) * d; if (add) { s = structuredClone(s); s.players.find((x) => x.id === p.id)!.money += add; } }
      }
      if (s.turn !== lastTurn) { // 차례마다: 돈이 30만원 미만인 생존국 수
        lastTurn = s.turn;
        st.turns++;
        st.poorTurns += s.players.filter((p) => !p.bankrupt && p.money < 30).length;
      }
      if (first < 0 && s.bankruptOrder.length) first = s.turn;
    }
    st.bank += s.bankruptOrder.length;
    if (first >= 0) { st.anyBank++; st.firstBankTurn.push(first); }
    if (s.phase === 'GAME_OVER' && s.endReason === 'LAST_STANDING') st.lastStanding++;
    const alive = s.players.filter((p) => !p.bankrupt);
    st.alive += alive.length;
    st.endCash += alive.reduce((n, p) => n + p.money, 0);
    const oc = Object.values(s.colonies).filter((c) => c.owner);
    st.cols += oc.length;
    st.stage += oc.reduce((n, c) => n + c.stage, 0);
    st.mine += oc.filter((c) => c.stage >= 3).length;
    const w = (s.ranking ?? computeRanking(s))[0].id;
    st.wins[w] = (st.wins[w] ?? 0) + 1;
  }
  return st;
}

const f1 = (n: number) => n.toFixed(1);
const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;
for (const maxTurns of (process.env.TURNS ?? '72,120').split(',').map(Number)) {
  console.log(`\n■ [${STUDENT ? '학생형: 15만원만 남기고 투자' : 'AI 기본: 60만원 남김'}] ${maxTurns}차례 (약 ${Math.round(maxTurns * 25 / 60)}분) · 각 ${GAMES}판`);
  console.log('개발 | 자금 | 파산국/판 | 파산 1국↑ 판 | 첫 파산 차례 | 빚 위기/판 | 돈 30만↓ 비율 | 생존국 평균 현금 | 식민지 수 | 평균 단계 | 광산↑ | 1위 영·프·독·미');
  const devs = (process.env.DEV ?? 'all,one,landing').split(',') as DevMode[];
  const econs = ECON.filter((e) => (process.env.ECON ?? 'E0,E1,E2,E3,E4').split(',').includes(e.key));
  for (const dev of devs) {
    for (const e of econs) {
      const t = run(dev, e, maxTurns);
      const ft = t.firstBankTurn.length ? Math.round(t.firstBankTurn.reduce((a, b) => a + b, 0) / t.firstBankTurn.length) : '-';
      console.log([
        DEV_LABEL[dev], `${e.key} ${e.label}`, f1(t.bank / GAMES), pct(t.anyBank, GAMES), ft, f1(t.debts / GAMES),
        pct(t.poorTurns, t.turns * 4), `${Math.round(t.endCash / t.alive)}만`, f1(t.cols / GAMES), (t.stage / t.cols).toFixed(2), pct(t.mine, t.cols),
        ALL.map((id) => pct(t.wins[id] ?? 0, GAMES)).join('·'),
      ].join(' | '));
    }
  }
}
