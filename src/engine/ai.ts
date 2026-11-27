// AI 플레이어: 지금 상태에서 AI 나라가 낼 액션을 고른다 (순수 함수, rand만 주입).
import { COLONIES, SPECIAL_TILES } from '../data/gameData';
import { QUIZZES } from '../data/quiz';
import { canApply } from './reducer';
import { getPlayer, isAllied, keyById, ownedColonies } from './selectors';
import type { Action, GameState, PlayerId } from './types';

const RESERVE = 60; // 무역대금·통행료에 대비해 남겨 두는 돈
const KEY_PREF = ['EXPLOIT', 'WAR', 'TOLL_EXEMPT', 'DEFENSE', 'SABOTAGE', 'ALLIANCE', 'SELL_COLONY', 'LOAN'];

export function chooseAiAction(s: GameState, me: PlayerId, rand: () => number = Math.random): Action {
  const pd = s.pending;
  const p = getPlayer(s, me);
  const nextCost = (id: string) => COLONIES[id].stages[s.colonies[id].stage + 1].cost;

  if (!pd) {
    if (p.skipTurns > 0) return (s.settings.diceCount ?? 1) >= 2 ? { type: 'ROLL_DICE' } : { type: 'LIBERIA_WAIT' }; // 더블이면 탈출
    for (const id of p.heldCards) {
      const k = keyById(id);
      if (k.effect === 'WAR' && p.money >= (k.cost ?? 0) + RESERVE * 2) {
        // 무역대금이 가장 비싼 적국 식민지
        const target = enemyColonies(s, me).sort((a, b) => tollOf(s, b) - tollOf(s, a))[0];
        if (target) return { type: 'USE_KEY', cardId: id, targetColonyId: target };
      }
      if (k.effect === 'SABOTAGE' && p.money >= (k.cost ?? 0) + RESERVE * 2) {
        const target = enemyColonies(s, me).filter((c) => s.colonies[c].stage > 0).sort((a, b) => tollOf(s, b) - tollOf(s, a))[0];
        if (target && tollOf(s, target) >= 25) return { type: 'USE_KEY', cardId: id, targetColonyId: target };
      }
      if (k.effect === 'ALLIANCE') {
        // 식민지를 가장 많이 가진 상대와 동맹 (내가 낼 무역대금이 줄어듦)
        const t = s.players.filter((x) => x.id !== me && !x.bankrupt && !isAllied(s, me, x.id))
          .sort((a, b) => ownedColonies(s, b.id).length - ownedColonies(s, a.id).length)[0];
        if (t) return { type: 'USE_KEY', cardId: id, targetPlayer: t.id };
      }
      if (k.effect === 'SELL_COLONY' && p.money < RESERVE) {
        const c = cheapestColony(s, me);
        if (c) return { type: 'USE_KEY', cardId: id, targetColonyId: c };
      }
    }
    return { type: 'ROLL_DICE' };
  }

  switch (pd.type) {
    case 'BUY':
      return p.money - COLONIES[pd.colonyId].price >= RESERVE ? { type: 'BUY_COLONY' } : { type: 'SKIP' };
    case 'DEVELOP':
      return p.money - nextCost(pd.colonyId) >= RESERVE ? { type: 'DEVELOP_COLONY' } : { type: 'SKIP' };
    case 'START_DEVELOP': {
      // 무역대금이 많이 오르는 곳부터
      const gain = (id: string) => COLONIES[id].stages[s.colonies[id].stage + 1].toll - tollOf(s, id);
      let left = p.money - RESERVE;
      const ids = [...pd.colonyIds].sort((a, b) => gain(b) - gain(a)).filter((id) => {
        if (left < nextCost(id)) return false;
        left -= nextCost(id);
        return true;
      });
      const lim = s.settings.startDevelopLimit ?? 0;
      return { type: 'DEVELOP_MANY', colonyIds: lim > 0 ? ids.slice(0, lim) : ids };
    }
    case 'PAY_TOLL': {
      const useExempt = pd.amount >= 25 && canApply(s, { type: 'PAY_TOLL', useExempt: true });
      return { type: 'PAY_TOLL', useExempt };
    }
    case 'FASHODA_OFFER':
      return { type: 'FASHODA', accept: p.money >= SPECIAL_TILES.fashoda.price + RESERVE * 2 };
    case 'QUIZ': {
      const q = QUIZZES.find((x) => x.id === pd.quizId)!;
      return { type: 'ANSWER_QUIZ', answer: rand() < 0.7 ? q.answer : !q.answer }; // 70% 정답
    }
    case 'KEY_CHOICE': {
      const rank = (id: string) => KEY_PREF.indexOf(keyById(id).effect);
      const [a, b] = pd.cardIds;
      return { type: 'CHOOSE_KEY', cardId: rank(a) <= rank(b) ? a : b };
    }
    case 'DEFENSE_PROMPT': {
      const worth = s.colonies[pd.colonyId].invested >= 60 || s.colonies[pd.colonyId].stage >= 2;
      const ok = canApply(s, { type: 'RESPOND_DEFENSE', defend: true }) && p.money >= 200 + 30;
      return { type: 'RESPOND_DEFENSE', defend: worth && ok };
    }
    case 'ALLIANCE_PROMPT': {
      // 상대가 식민지를 나보다 많이 가졌으면 수락 (내가 이득)
      return { type: 'RESPOND_ALLIANCE', accept: ownedColonies(s, pd.from).length >= ownedColonies(s, me).length };
    }
    case 'DEBT': {
      if (canApply(s, { type: 'PAY_DEBT' })) return { type: 'PAY_DEBT' };
      const c = cheapestColony(s, pd.debtor);
      return c ? { type: 'SELL_FOR_DEBT', colonyId: c } : { type: 'DECLARE_BANKRUPTCY' };
    }
    case 'NOTICE':
    case 'KEY_DRAWN':
      return { type: 'ACK' };
  }
}

/** AI가 행동하기 전 기다릴 시간 (사람이 화면을 읽을 수 있게) */
export function aiDelayMs(s: GameState): number {
  const pd = s.pending;
  if (!pd) return 1100;
  if (pd.type === 'NOTICE') return Math.max(2200, (pd.minMs ?? 0) + 400);
  if (pd.type === 'KEY_DRAWN' || pd.type === 'QUIZ') return 2200;
  return 1500;
}

const tollOf = (s: GameState, id: string) => COLONIES[id].stages[s.colonies[id].stage].toll;
const enemyColonies = (s: GameState, me: PlayerId) =>
  Object.keys(s.colonies).filter((c) => s.colonies[c].owner && s.colonies[c].owner !== me);
const cheapestColony = (s: GameState, me: PlayerId) =>
  ownedColonies(s, me).sort((a, b) => s.colonies[a].invested - s.colonies[b].invested)[0];

