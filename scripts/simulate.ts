// 엔진만으로 4개국이 무작위로 플레이하는 시뮬레이션. 실행: npm run simulate
// 수업 한 차시 안에 끝나는지(밸런스) 확인용.
import { COLONIES } from '../src/data/gameData';
import { canApply, reduce } from '../src/engine/reducer';
import { computeRanking, currentPlayer, getPlayer, keyById } from '../src/engine/selectors';
import { createGame } from '../src/engine/setup';
import type { Action, GameState, PlayerId } from '../src/engine/types';

declare const process: { env: Record<string, string | undefined> };

const GAMES = 300;
const MAX_TURNS = Number(process.env.MAX_TURNS ?? 200); // 예: MAX_TURNS=72 npm run simulate (30분 수업)
const SEC_PER_TURN = 25; // 교실에서 한 차례에 걸리는 시간(추정)

function botAction(s: GameState, r: () => number): Action {
  const pd = s.pending;
  const p = currentPlayer(s);
  if (!pd) {
    if (p.skipTurns > 0) return (s.settings.diceCount ?? 1) >= 2 ? { type: 'ROLL_DICE' } : { type: 'LIBERIA_WAIT' };
    for (const id of p.heldCards) {
      const k = keyById(id);
      if (k.effect === 'WAR' && r() < 0.5) {
        const t = Object.keys(s.colonies).find((c) => s.colonies[c].owner && s.colonies[c].owner !== p.id);
        const a: Action = { type: 'USE_KEY', cardId: id, targetColonyId: t };
        if (t && canApply(s, a)) return a;
      }
      if (k.effect === 'ALLIANCE') {
        const t = s.players.find((x) => x.id !== p.id && !x.bankrupt)?.id;
        const a: Action = { type: 'USE_KEY', cardId: id, targetPlayer: t };
        if (canApply(s, a)) return a;
      }
    }
    return { type: 'ROLL_DICE' };
  }
  switch (pd.type) {
    case 'BUY': return p.money > COLONIES[pd.colonyId].price + 30 ? { type: 'BUY_COLONY' } : { type: 'SKIP' };
    case 'START_DEVELOP': {
      let left = p.money - 50; // 여유 자금 50만원은 남김
      const ids = pd.colonyIds.filter((id) => {
        const cost = COLONIES[id].stages[s.colonies[id].stage + 1].cost;
        if (left < cost) return false;
        left -= cost;
        return true;
      });
      const lim = s.settings.startDevelopLimit ?? 0;
      return { type: 'DEVELOP_MANY', colonyIds: lim > 0 ? ids.slice(0, lim) : ids };
    }
    case 'DEVELOP': return canApply(s, { type: 'DEVELOP_COLONY' }) && p.money > 80 ? { type: 'DEVELOP_COLONY' } : { type: 'SKIP' };
    case 'PAY_TOLL': return { type: 'PAY_TOLL', useExempt: canApply(s, { type: 'PAY_TOLL', useExempt: true }) };
    case 'FASHODA_OFFER': return { type: 'FASHODA', accept: p.money > 350 };
    case 'QUIZ': return { type: 'ANSWER_QUIZ', answer: r() < 0.5 };
    case 'KEY_CHOICE': return { type: 'CHOOSE_KEY', cardId: pd.cardIds[0] };
    case 'DEFENSE_PROMPT': return { type: 'RESPOND_DEFENSE', defend: canApply(s, { type: 'RESPOND_DEFENSE', defend: true }) };
    case 'ALLIANCE_PROMPT': return { type: 'RESPOND_ALLIANCE', accept: r() < 0.6 };
    case 'DEBT': {
      const debtor = getPlayer(s, pd.debtor);
      const sell = Object.keys(s.colonies).find((c) => s.colonies[c].owner === debtor.id);
      if (canApply(s, { type: 'PAY_DEBT' })) return { type: 'PAY_DEBT' };
      return sell ? { type: 'SELL_FOR_DEBT', colonyId: sell } : { type: 'DECLARE_BANKRUPTCY' };
    }
    default: return { type: 'ACK' };
  }
}

const wins: Record<string, number> = {};
let totalTurns = 0;
let finished = 0;
let bankruptcies = 0;
for (let g = 0; g < GAMES; g++) {
  let seed = g * 7919 + 1;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let s = createGame(['UK', 'FRANCE', 'GERMANY', 'USA'] as PlayerId[], {}, g + 1);
  let guard = 0;
  while (s.phase === 'PLAYING' && s.turn <= MAX_TURNS && guard++ < 20000) {
    const n = reduce(s, botAction(s, r));
    if (n === s) throw new Error(`stuck: ${s.pending?.type}`);
    s = n;
  }
  if (s.phase === 'GAME_OVER') finished++;
  const ranking = s.ranking ?? computeRanking(s);
  wins[ranking[0].id] = (wins[ranking[0].id] ?? 0) + 1;
  totalTurns += Math.min(s.turn, MAX_TURNS);
  bankruptcies += s.bankruptOrder.length;
}

const avgTurns = totalTurns / GAMES;
console.log(`게임 ${GAMES}판 (최대 ${MAX_TURNS}차례)`);
console.log(`마지막 1국 생존으로 끝난 비율: ${((finished / GAMES) * 100).toFixed(1)}%`);
console.log(`평균 차례 수: ${avgTurns.toFixed(1)} → 차례당 ${SEC_PER_TURN}초면 약 ${((avgTurns * SEC_PER_TURN) / 60).toFixed(0)}분`);
console.log(`판당 평균 파산국: ${(bankruptcies / GAMES).toFixed(2)}`);
console.log(`30분(약 ${Math.round((30 * 60) / SEC_PER_TURN)}차례) 타이머 기준이면 대부분 총자산 순위로 끝남`);
console.log('1위 횟수(차례 순서 영국→프랑스→독일→미국):', wins);
