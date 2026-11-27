// 승리 기준을 바꾸면 어떻게 되는지 비교하는 시뮬레이션. 실행: npx tsx scripts/simulate-victory.ts
// 게임 규칙·AI는 그대로 두고, 30분(72차례)이 끝난 시점의 순위만 여러 기준으로 다시 매긴다.
import { COLONIES } from '../src/data/gameData';
import { chooseAiAction } from '../src/engine/ai';
import { reduce } from '../src/engine/reducer';
import { actorOf, assetRow, getPlayer } from '../src/engine/selectors';
import { createGame } from '../src/engine/setup';
import type { Action, GameState, PlayerId } from '../src/engine/types';

declare const process: { env: Record<string, string | undefined> };
const GAMES = Number(process.env.GAMES ?? 1000);
const MAX_TURNS = Number(process.env.MAX_TURNS ?? 72);
const ALL: PlayerId[] = ['UK', 'FRANCE', 'GERMANY', 'USA'];
const NAME: Record<PlayerId, string> = { UK: '영', FRANCE: '프', GERMANY: '독', USA: '미' } as Record<PlayerId, string>;

// ── 승리 기준 ─────────────────────────────────────────────
interface Score { main: number; tie: number } // main이 같으면 tie로 가린다
type Criterion = { key: string; label: string; score: (s: GameState, id: PlayerId) => Score };
const cols = (s: GameState, id: PlayerId) => Object.keys(s.colonies).filter((c) => s.colonies[c].owner === id);
const stageSum = (s: GameState, id: PlayerId) => cols(s, id).reduce((n, c) => n + s.colonies[c].stage, 0);
const assets = (s: GameState, id: PlayerId) => assetRow(s, getPlayer(s, id)).total;
const fashoda = (s: GameState, id: PlayerId) => (s.fashoda.owner === id ? 1 : 0);
const cashNet = (s: GameState, id: PlayerId) => { const p = getPlayer(s, id); return p.money - p.loan; };
const colScore = (f: number) => (s: GameState, id: PlayerId): Score => ({ main: cols(s, id).length + stageSum(s, id) + fashoda(s, id) * f, tie: cashNet(s, id) });

const CRITERIA: Criterion[] = [
  { key: 'A', label: '총자산 (현재)', score: (s, id) => ({ main: assets(s, id), tie: cols(s, id).length }) },
  { key: 'B', label: '식민지 수 (동점이면 개발 단계 합)', score: (s, id) => ({ main: cols(s, id).length + fashoda(s, id), tie: stageSum(s, id) * 1e4 + assets(s, id) }) },
  { key: 'C', label: '식민지 점수 = 식민지마다 (1 + 단계)', score: (s, id) => ({ main: cols(s, id).length + stageSum(s, id) + fashoda(s, id), tie: assets(s, id) }) },
  { key: 'C0', label: '식민지 점수, 파쇼다 0점, 동점→현금−대출', score: colScore(0) },
  { key: 'C1', label: '식민지 점수, 파쇼다 1점, 동점→현금−대출', score: colScore(1) },
  { key: 'C2', label: '식민지 점수, 파쇼다 2점, 동점→현금−대출', score: colScore(2) },
  { key: 'C3', label: '식민지 점수, 파쇼다 3점, 동점→현금−대출', score: colScore(3) },
  { key: 'D', label: '개발 단계 합만', score: (s, id) => ({ main: stageSum(s, id), tie: assets(s, id) }) },
];

function rank(s: GameState, c: Criterion): { order: PlayerId[]; tiedTop: boolean } {
  const alive = s.players.filter((p) => !p.bankrupt).map((p) => ({ id: p.id, ...c.score(s, p.id) }));
  alive.sort((a, b) => b.main - a.main || b.tie - a.tie);
  const dead = [...s.bankruptOrder].reverse();
  return { order: [...alive.map((x) => x.id), ...dead], tiedTop: alive.length > 1 && alive[0].main === alive[1].main };
}

// ── 플레이어: 게임 AI. greedy 국가는 '식민지 늘리기'에 올인 ────────
function greedyAction(s: GameState, me: PlayerId, r: () => number): Action {
  const pd = s.pending;
  const p = getPlayer(s, me);
  const RES = 15;
  if (pd?.type === 'BUY') return p.money - COLONIES[pd.colonyId].price >= RES ? { type: 'BUY_COLONY' } : { type: 'SKIP' };
  if (pd?.type === 'DEVELOP') {
    const c = s.colonies[pd.colonyId];
    return p.money - COLONIES[pd.colonyId].stages[c.stage + 1].cost >= RES ? { type: 'DEVELOP_COLONY' } : { type: 'SKIP' };
  }
  if (pd?.type === 'START_DEVELOP') {
    let left = p.money - RES;
    const ids = [...pd.colonyIds].sort((a, b) => COLONIES[a].stages[s.colonies[a].stage + 1].cost - COLONIES[b].stages[s.colonies[b].stage + 1].cost)
      .filter((id) => { const cost = COLONIES[id].stages[s.colonies[id].stage + 1].cost; if (left < cost) return false; left -= cost; return true; });
    return { type: 'DEVELOP_MANY', colonyIds: ids };
  }
  return chooseAiAction(s, me, r);
}

function play(g: number, greedy: PlayerId | null, snapshotAt: number) {
  let seed = g * 7919 + 13;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let s = createGame(ALL, {}, g + 1);
  let snap: GameState | null = null;
  let guard = 0;
  while (s.phase === 'PLAYING' && s.turn <= MAX_TURNS && guard++ < 30000) {
    if (!snap && s.turn >= snapshotAt) snap = s;
    const me = actorOf(s);
    const forceF = process.env.FORCE_FASHODA === '1' && me === 'UK' && s.pending?.type === 'FASHODA_OFFER' && getPlayer(s, me).money >= 200;
    const a: Action = forceF ? { type: 'FASHODA', accept: true } : me === greedy ? greedyAction(s, me, r) : chooseAiAction(s, me, r);
    const n = reduce(s, a);
    if (n === s) throw new Error(`stuck: ${s.pending?.type}`);
    s = n;
  }
  return { s, snap: snap ?? s };
}

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(0)}%`;

// ── 1) 기본: 4개국 모두 같은 AI ─────────────────────────────
const wins: Record<string, Record<string, number>> = {};
const ties: Record<string, number> = {};
const sameAsA: Record<string, number> = {};
const lateFlip: Record<string, number> = {};
let ukF = 0; const ukFwin: Record<string, number> = {};
let bankrupt = 0, colonyTotal = 0, stageTotal = 0, unowned = 0;
const SNAP = Math.round(MAX_TURNS * 2 / 3);
for (let g = 0; g < GAMES; g++) {
  const { s, snap } = play(g, null, SNAP);
  bankrupt += s.bankruptOrder.length;
  const owned = Object.values(s.colonies).filter((c) => c.owner);
  colonyTotal += owned.length;
  stageTotal += owned.reduce((n, c) => n + c.stage, 0);
  unowned += Object.keys(s.colonies).length - owned.length;
  const winA = rank(s, CRITERIA[0]).order[0];
  const fo = s.fashoda.owner === 'UK'; if (fo) ukF++;
  for (const c of CRITERIA) {
    const { order, tiedTop } = rank(s, c);
    (wins[c.key] ??= {})[order[0]] = (wins[c.key][order[0]] ?? 0) + 1;
    if (tiedTop) ties[c.key] = (ties[c.key] ?? 0) + 1;
    if (fo && order[0] === 'UK') ukFwin[c.key] = (ukFwin[c.key] ?? 0) + 1;
    if (order[0] === winA) sameAsA[c.key] = (sameAsA[c.key] ?? 0) + 1;
    if (rank(snap, c).order[0] !== order[0]) lateFlip[c.key] = (lateFlip[c.key] ?? 0) + 1;
  }
}

console.log(`\n■ 기본 비교 — ${GAMES}판, 30분(${MAX_TURNS}차례), 4개국 모두 게임 AI`);
console.log(`  판당 파산국 ${(bankrupt / GAMES).toFixed(2)} · 끝날 때 식민지 ${(colonyTotal / GAMES).toFixed(1)}곳 소유(빈 땅 ${(unowned / GAMES).toFixed(1)}곳) · 소유 식민지 평균 단계 ${(stageTotal / colonyTotal).toFixed(2)}`);
console.log('  기준 | 1위 영·프·독·미 | 1위 동점(본점수) | 총자산 1위와 같음 | 2/3 시점 선두가 뒤집힘');
for (const c of CRITERIA) {
  const w = ALL.map((id) => pct(wins[c.key][id] ?? 0, GAMES)).join('·');
  console.log(`  ${c.key} ${c.label} | ${w} | ${pct(ties[c.key] ?? 0, GAMES)} | ${pct(sameAsA[c.key] ?? 0, GAMES)} | ${pct(lateFlip[c.key] ?? 0, GAMES)}`);
}

console.log(`
  영국이 파쇼다를 점령한 판: ${pct(ukF, GAMES)}  → 그 판에서 영국 1위 비율:`);
for (const c of CRITERIA) console.log(`    ${c.key}: ${pct(ukFwin[c.key] ?? 0, Math.max(1, ukF))}`);

// ── 2) 전략 변수: 한 나라만 '식민지 늘리기 올인'일 때 그 나라 승률 ──
console.log(`\n■ 전략 변수 — 한 나라만 '여유 자금 15만원만 남기고 확보·개발 올인' (나라를 돌아가며, 각 ${Math.round(GAMES / 4)}판)`);
const gw: Record<string, number> = {};
let gBank = 0;
const per = Math.round(GAMES / 4);
for (const gid of ALL) {
  for (let g = 0; g < per; g++) {
    const { s } = play(100000 + g, gid, MAX_TURNS + 1);
    if (s.bankruptOrder.includes(gid)) gBank++;
    for (const c of CRITERIA) if (rank(s, c).order[0] === gid) gw[c.key] = (gw[c.key] ?? 0) + 1;
  }
}
console.log(`  올인한 나라가 파산한 비율: ${pct(gBank, per * 4)}`);
for (const c of CRITERIA) console.log(`  ${c.key} ${c.label}: 올인한 나라 1위 ${pct(gw[c.key] ?? 0, per * 4)} (기준 25%)`);
void NAME;
