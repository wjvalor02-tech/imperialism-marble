import { BOARD, COLONIES, SPECIAL_TILES } from '../data/gameData';
import { QUIZZES } from '../data/quiz';
import { addLog, declareBankrupt, transfer } from './money';
import { randInt, shuffle } from './rng';
import {
  computeRanking, currentPlayer, getPlayer, investmentFor, isAllied, josa, keyById,
  nationName, tileName, won,
} from './selectors';
import { emptyColony } from './setup';
import type { Action, Charge, Continuation, GameState, Pending, PlayerId, PlayerState } from './types';

const BOARD_SIZE = BOARD.length;

/**
 * 순수 reducer: (state, action) => newState.
 * 규칙상 불가능한 액션이면 원래 state를 그대로 돌려준다.
 */
export function reduce(prev: GameState, action: Action): GameState {
  const s = structuredClone(prev);
  return apply(s, action) ? s : prev;
}

/** 지금 이 액션이 유효한지 (버튼 활성화 판단용) */
export function canApply(s: GameState, action: Action): boolean {
  return reduce(s, action) !== s;
}

function apply(s: GameState, a: Action): boolean {
  if (a.type === 'GO_REFLECTION') {
    if (s.phase !== 'GAME_OVER') return false;
    s.phase = 'REFLECTION';
    return true;
  }
  if (s.phase !== 'PLAYING') return false;
  const p = currentPlayer(s);
  const pd = s.pending;

  switch (a.type) {
    // ── 차례 시작 ──────────────────────────────
    case 'ROLL_DICE': {
      if (pd || p.skipTurns > 0) return false;
      const dice = Array.from({ length: s.settings.diceCount ?? 1 }, () => randInt(s, 1, 6));
      s.lastRoll = dice;
      const steps = dice.reduce((x, y) => x + y, 0);
      addLog(s, { kind: 'event', player: p.id, text: `🎲 ${nationName(p.id)} 주사위 ${dice.join('+')} → ${steps}칸` });
      const charges = moveSteps(s, p, steps, 'dice');
      processCharges(s, p.id, charges, 'START_DEV');
      return true;
    }
    case 'LIBERIA_WAIT': {
      if (pd || p.skipTurns <= 0) return false;
      p.skipTurns -= 1;
      addLog(s, { kind: 'event', player: p.id, text: `⛓ ${nationName(p.id)} 라이베리아에서 대기 (남은 ${p.skipTurns}턴)` });
      endTurn(s);
      return true;
    }
    case 'LIBERIA_PENALTY_DONE': {
      if (pd || p.skipTurns <= 0) return false;
      p.skipTurns = 0;
      addLog(s, { kind: 'event', player: p.id, text: `🍑 ${nationName(p.id)} 벌칙(엉덩이로 이름쓰기) 수행 완료 — 진행자 확인, 라이베리아 탈출` });
      return true;
    }

    // ── 칸 결정 ──────────────────────────────
    case 'BUY_COLONY': {
      if (pd?.type !== 'BUY') return false;
      const col = COLONIES[pd.colonyId];
      if (p.money < col.price) return false;
      transfer(s, p.id, 'BANK', col.price, `${col.name} 확보`);
      const c = s.colonies[pd.colonyId];
      c.owner = p.id;
      c.stage = 0;
      c.invested = col.price;
      c.lastDevelopedLap = p.lap;
      if (!c.everOwned.includes(p.id)) c.everOwned.push(p.id);
      addLog(s, { kind: 'event', player: p.id, text: `🚩 ${nationName(p.id)}, ${col.name}을(를) 식민지로 확보` });
      notice(s, {
        tone: 'good', icon: '🚩', title: `${col.name} — ${nationName(p.id)}의 식민지가 되었습니다`,
        lines: [`${won(col.price)}을 내고 ${col.name}을(를) 확보했습니다. 다른 나라가 이곳에 서면 무역대금 ${won(col.stages[0].toll)}을 받습니다.`],
        note: `실제 역사에서의 지배국: ${col.historicalRuler}`, then: 'END_TURN',
      });
      return true;
    }
    case 'DEVELOP_COLONY': {
      if (pd?.type !== 'DEVELOP') return false;
      const col = COLONIES[pd.colonyId];
      const c = s.colonies[pd.colonyId];
      const next = col.stages[c.stage + 1];
      if (!next || p.money < next.cost) return false;
      const oldToll = col.stages[c.stage].toll;
      transfer(s, p.id, 'BANK', next.cost, `${col.name} ${next.name}`);
      c.stage += 1;
      c.invested += next.cost;
      c.lastDevelopedLap = p.lap;
      addLog(s, { kind: 'event', player: p.id, text: `🏗 ${col.name}: ${next.name} (무역대금 ${won(next.toll)})` });
      notice(s, {
        tone: 'good', icon: '🏗', title: `${col.name} — ${next.name}`,
        lines: [`무역대금이 ${won(oldToll)} → ${won(next.toll)}(으)로 오릅니다.`], then: 'END_TURN',
      });
      return true;
    }
    case 'DEVELOP_MANY': {
      if (pd?.type !== 'START_DEVELOP') return false;
      const ids = [...new Set(a.colonyIds)];
      if (ids.some((id) => !pd.colonyIds.includes(id))) return false;
      const cost = ids.reduce((sum, id) => sum + COLONIES[id].stages[s.colonies[id].stage + 1].cost, 0);
      if (cost > p.money) return false;
      for (const id of ids) {
        const col = COLONIES[id];
        const c = s.colonies[id];
        const next = col.stages[c.stage + 1];
        transfer(s, p.id, 'BANK', next.cost, `${col.name} ${next.name}`);
        c.stage += 1;
        c.invested += next.cost;
        c.lastDevelopedLap = p.lap;
        addLog(s, { kind: 'event', player: p.id, text: `🏗 ${col.name}: ${next.name} (무역대금 ${won(next.toll)})` });
      }
      cont(s, pd.then);
      return true;
    }
    case 'SKIP': {
      if (pd?.type !== 'BUY' && pd?.type !== 'DEVELOP') return false;
      endTurn(s);
      return true;
    }
    case 'PAY_TOLL': {
      if (pd?.type !== 'PAY_TOLL') return false;
      if (a.useExempt) {
        const card = p.heldCards.find((id) => keyById(id).effect === 'TOLL_EXEMPT');
        if (!card) return false;
        discardCard(s, p, card);
        addLog(s, { kind: 'key', player: p.id, text: `🎟 ${nationName(p.id)}, 무역대금 면제권 사용 (${tileName(p.position)} ${won(pd.amount)} 면제)` });
        endTurn(s);
        return true;
      }
      processCharges(s, p.id, [{
        to: pd.owner, amount: pd.amount, colonyId: pd.colonyId,
        reason: `${tileName(p.position)} 무역대금${pd.allied ? '(동맹 절반)' : ''}`,
      }], 'END_TURN');
      return true;
    }
    case 'FASHODA': {
      if (pd?.type !== 'FASHODA_OFFER') return false;
      if (!a.accept) {
        addLog(s, { kind: 'event', player: p.id, text: `영국, 파쇼다 점령을 보류 → 황금열쇠` });
        drawKey(s);
        return true;
      }
      const f = SPECIAL_TILES.fashoda;
      if (p.money < f.price) return false;
      const france = s.players.find((x) => x.id === 'FRANCE' && !x.bankrupt);
      transfer(s, p.id, france ? 'FRANCE' : 'BANK', f.price, '파쇼다 점령 (프랑스에 지불)');
      s.fashoda = { owner: p.id, occupied: true };
      addLog(s, { kind: 'event', player: p.id, text: `⚔ 파쇼다 사건: 영국이 파쇼다를 점령 (무역대금 ${won(f.toll)})` });
      notice(s, {
        tone: 'history', icon: '⚔', title: '파쇼다 사건 (1898)',
        lines: [
          '영국의 종단 정책(카이로–케이프타운)과 프랑스의 횡단 정책(알제리–마다가스카르)이 수단의 파쇼다에서 충돌하였습니다.',
          '실제 역사에서는 프랑스가 물러났고, 두 나라는 1904년 영·프 협상으로 서로의 세력권을 인정하였습니다.',
        ],
        note: '생각해 보기: 열강이 땅을 나눌 때, 그곳에 살던 수단 사람들의 의사는 반영되었을까?',
        minMs: 3000, then: 'END_TURN',
      });
      return true;
    }
    case 'ACK': {
      if (pd?.type === 'NOTICE') {
        if (pd.charges?.length) processCharges(s, p.id, pd.charges, pd.then);
        else cont(s, pd.then);
        return true;
      }
      if (pd?.type === 'KEY_DRAWN') {
        endTurn(s);
        return true;
      }
      return false;
    }

    // ── 황금열쇠 ──────────────────────────────
    case 'ANSWER_QUIZ': {
      if (pd?.type !== 'QUIZ') return false;
      const q = QUIZZES.find((x) => x.id === pd.quizId)!;
      const correct = q.answer === a.answer;
      addLog(s, { kind: 'key', player: p.id, text: `❓ 퀴즈 ${correct ? '정답' : '오답'}: ${q.q}` });
      if (correct) {
        const c1 = takeCard(s);
        const c2 = takeCard(s);
        if (c1 && c2) s.pending = { type: 'KEY_CHOICE', cardIds: [c1, c2] };
        else if (c1) applyDrawn(s, c1);
        else noKeys(s);
      } else drawOne(s);
      return true;
    }
    case 'CHOOSE_KEY': {
      if (pd?.type !== 'KEY_CHOICE' || !pd.cardIds.includes(a.cardId)) return false;
      const other = pd.cardIds.find((id) => id !== a.cardId)!;
      s.deck.unshift(other); // 고르지 않은 카드는 더미 맨 아래로
      applyDrawn(s, a.cardId);
      return true;
    }
    case 'USE_KEY': {
      if (pd || !p.heldCards.includes(a.cardId)) return false;
      const k = keyById(a.cardId);
      switch (k.effect) {
        case 'WAR': {
          const cid = a.targetColonyId;
          const c = cid ? s.colonies[cid] : undefined;
          if (!cid || !c?.owner || c.owner === p.id || p.money < (k.cost ?? 0)) return false;
          transfer(s, p.id, 'BANK', k.cost ?? 0, `전쟁 비용 (${COLONIES[cid].name})`);
          discardCard(s, p, a.cardId);
          const defender = getPlayer(s, c.owner);
          addLog(s, { kind: 'key', player: p.id, text: `⚔ ${nationName(p.id)}이(가) ${nationName(defender.id)}의 ${COLONIES[cid].name}에 전쟁 선포` });
          if (defender.heldCards.some((id) => keyById(id).effect === 'DEFENSE')) {
            s.pending = { type: 'DEFENSE_PROMPT', attacker: p.id, defender: defender.id, colonyId: cid };
          } else conquer(s, p.id, cid, false);
          return true;
        }
        case 'SABOTAGE': {
          const cid = a.targetColonyId;
          const c = cid ? s.colonies[cid] : undefined;
          if (!cid || !c?.owner || c.owner === p.id || c.stage <= 0 || p.money < (k.cost ?? 0)) return false;
          const col = COLONIES[cid];
          const victim = c.owner;
          transfer(s, p.id, 'BANK', k.cost ?? 0, `중요시설 파괴 비용 (${col.name})`);
          discardCard(s, p, a.cardId);
          const lost = col.stages[c.stage];
          c.invested -= lost.cost;
          c.stage -= 1;
          addLog(s, { kind: 'key', player: p.id, text: `💣 ${nationName(p.id)}, ${nationName(victim)}의 ${col.name} '${lost.name}' 파괴` });
          notice(s, {
            tone: 'bad', icon: '💣', title: `${col.name} 중요시설 파괴`,
            lines: [`${nationName(victim)}의 ${col.name}에서 '${lost.name}'이(가) 파괴되었습니다.`,
              `무역대금 ${won(lost.toll)} → ${won(col.stages[c.stage].toll)}`],
            then: 'RESUME',
          });
          return true;
        }
        case 'SELL_COLONY': {
          const cid = a.targetColonyId;
          if (!cid || s.colonies[cid]?.owner !== p.id) return false;
          discardCard(s, p, a.cardId);
          const price = sellColony(s, p.id, cid);
          notice(s, {
            tone: 'info', icon: '💰', title: `${COLONIES[cid].name} 매각`,
            lines: [`국제은행에 ${COLONIES[cid].name}을(를) 매각하고 ${won(price)}을 받았습니다.`], then: 'RESUME',
          });
          return true;
        }
        case 'ALLIANCE': {
          const t = a.targetPlayer;
          if (!t || t === p.id) return false;
          const tp = s.players.find((x) => x.id === t);
          if (!tp || tp.bankrupt || isAllied(s, p.id, t)) return false;
          discardCard(s, p, a.cardId);
          addLog(s, { kind: 'key', player: p.id, text: `🤝 ${nationName(p.id)}이(가) ${nationName(t)}에 동맹 제안` });
          s.pending = { type: 'ALLIANCE_PROMPT', from: p.id, to: t };
          return true;
        }
        default:
          return false; // 면제·방어는 상황이 생길 때 자동으로 묻는다
      }
    }
    case 'RESPOND_DEFENSE': {
      if (pd?.type !== 'DEFENSE_PROMPT') return false;
      const d = getPlayer(s, pd.defender);
      const card = d.heldCards.find((id) => keyById(id).effect === 'DEFENSE');
      const cost = card ? keyById(card).cost ?? 0 : 0;
      if (a.defend) {
        if (!card || d.money < cost) return false;
        transfer(s, d.id, 'BANK', cost, '방어 비용');
        discardCard(s, d, card);
        addLog(s, { kind: 'key', player: d.id, text: `🛡 ${nationName(d.id)}, 방어 성공! ${COLONIES[pd.colonyId].name}을(를) 지켰습니다` });
        notice(s, {
          tone: 'good', icon: '🛡', title: '방어 성공',
          lines: [`${nationName(d.id)}이(가) 방어카드로 ${COLONIES[pd.colonyId].name}을(를) 지켰습니다.`,
            `${nationName(pd.attacker)}은(는) 전쟁 비용만 잃었습니다.`],
          then: 'RESUME',
        });
      } else conquer(s, pd.attacker, pd.colonyId, true);
      return true;
    }
    case 'RESPOND_ALLIANCE': {
      if (pd?.type !== 'ALLIANCE_PROMPT') return false;
      if (a.accept) {
        s.alliances.push({ a: pd.from, b: pd.to, endLap: getPlayer(s, pd.from).lap + 2 });
        addLog(s, { kind: 'key', text: `🤝 ${nationName(pd.from)}–${nationName(pd.to)} 동맹 성립 (2바퀴, 서로 무역대금 절반)` });
      } else addLog(s, { kind: 'key', text: `✋ ${nationName(pd.to)}이(가) 동맹을 거절` });
      notice(s, {
        tone: a.accept ? 'good' : 'info', icon: '🤝', title: a.accept ? '동맹 성립' : '동맹 거절',
        lines: a.accept
          ? [`${nationName(pd.from)}과(와) ${nationName(pd.to)}은(는) ${nationName(pd.from)}이(가) 2바퀴를 도는 동안 서로의 식민지에서 무역대금을 절반만 냅니다.`]
          : [`${nationName(pd.to)}이(가) 동맹 제안을 거절했습니다. 카드는 사용되었습니다.`],
        then: 'RESUME',
      });
      return true;
    }

    // ── 부채·파산 ──────────────────────────────
    case 'SELL_FOR_DEBT': {
      if (pd?.type !== 'DEBT' || s.colonies[a.colonyId]?.owner !== pd.debtor) return false;
      sellColony(s, pd.debtor, a.colonyId);
      return true;
    }
    case 'PAY_DEBT': {
      if (pd?.type !== 'DEBT') return false;
      const total = sum(pd.charges);
      if (getPlayer(s, pd.debtor).money < total) return false;
      applyCharges(s, pd.debtor, pd.charges);
      cont(s, pd.then);
      return true;
    }
    case 'DECLARE_BANKRUPTCY': {
      if (pd?.type !== 'DEBT') return false;
      if (getPlayer(s, pd.debtor).money >= sum(pd.charges)) return false;
      declareBankrupt(s, pd.debtor, pd.charges[0].to);
      endTurn(s);
      return true;
    }

    // ── 시간·진행자 ──────────────────────────────
    case 'TIME_UP': {
      if (s.timeUp) return false;
      s.timeUp = true;
      addLog(s, { kind: 'event', text: '⏰ 수업 시간이 끝났습니다. 진행 중인 차례까지만 마칩니다.' });
      if (!pd) finish(s, 'TIME_UP');
      return true;
    }
    case 'HOST_ADJUST_MONEY': {
      const t = s.players.find((x) => x.id === a.player);
      if (!t || !a.reason.trim() || a.delta === 0) return false;
      const reason = `진행자 조정: ${a.reason}`;
      if (a.delta > 0) transfer(s, 'BANK', t.id, a.delta, reason);
      else transfer(s, t.id, 'BANK', Math.min(-a.delta, t.money), reason);
      addLog(s, { kind: 'host', player: t.id, text: `🛠 ${reason} — ${nationName(t.id)} ${a.delta > 0 ? '+' : ''}${won(a.delta)}` });
      return true;
    }
    case 'HOST_SET_OWNER': {
      const c = s.colonies[a.colonyId];
      if (!c || !a.reason.trim()) return false;
      if (a.owner && !s.players.some((x) => x.id === a.owner && !x.bankrupt)) return false;
      if (a.owner === null) {
        s.colonies[a.colonyId] = { ...emptyColony(), earned: c.earned, everOwned: c.everOwned };
      } else {
        if (!c.owner) { c.stage = 0; c.invested = COLONIES[a.colonyId].price; }
        c.owner = a.owner;
        if (!c.everOwned.includes(a.owner)) c.everOwned.push(a.owner);
      }
      addLog(s, { kind: 'host', text: `🛠 진행자 조정: ${COLONIES[a.colonyId].name} 소유 → ${a.owner ? nationName(a.owner) : '없음'} (${a.reason})` });
      return true;
    }
    case 'HOST_SET_STAGE': {
      const c = s.colonies[a.colonyId];
      const max = COLONIES[a.colonyId]?.stages.length - 1;
      if (!c?.owner || !a.reason.trim() || a.stage < 0 || a.stage > max) return false;
      c.stage = a.stage;
      c.invested = investmentFor(a.colonyId, a.stage);
      addLog(s, { kind: 'host', text: `🛠 진행자 조정: ${COLONIES[a.colonyId].name} 단계 → ${COLONIES[a.colonyId].stages[a.stage].name} (${a.reason})` });
      return true;
    }
    case 'HOST_SETTINGS': {
      s.settings = { ...s.settings, ...a.settings };
      addLog(s, { kind: 'host', text: '🛠 진행자: 게임 설정 변경' });
      return true;
    }
  }
  return false;
}

// ── 내부 도우미 ─────────────────────────────────────────

const sum = (cs: Charge[]) => cs.reduce((x, c) => x + c.amount, 0);

function notice(s: GameState, n: Omit<Extract<Pending, { type: 'NOTICE' }>, 'type'>) {
  s.pending = { type: 'NOTICE', ...n, title: josa(n.title), lines: n.lines.map(josa), note: n.note && josa(n.note) };
}

function cont(s: GameState, then: Continuation) {
  s.pending = null;
  if (then === 'END_TURN') endTurn(s);
  else if (then === 'RESOLVE_TILE') resolveTile(s);
  else if (then === 'SIAM_JUMP') siamJump(s);
  else if (then === 'START_DEV') offerStartDevelop(s);
}

/** 이번 바퀴에 아직 개발하지 않은, 더 올릴 단계가 있는 내 식민지 */
export function developableColonies(s: GameState, p: PlayerState): string[] {
  return Object.keys(s.colonies).filter((id) => {
    const c = s.colonies[id];
    return c.owner === p.id && c.stage < COLONIES[id].stages.length - 1 && c.lastDevelopedLap !== p.lap;
  });
}

/** 출발을 지났다면 개발할 식민지를 고르게 하고, 아니면 바로 칸 처리 */
function offerStartDevelop(s: GameState) {
  const p = currentPlayer(s);
  const ids = s.settings.developOnPassStart && (s.move.passes ?? 0) > 0 ? developableColonies(s, p) : [];
  if (ids.length) s.pending = { type: 'START_DEVELOP', colonyIds: ids, then: 'RESOLVE_TILE' };
  else resolveTile(s);
}

/** 필수 납부. 돈이 모자라면 DEBT(식민지 매각 → 그래도 부족하면 파산) */
function processCharges(s: GameState, pid: PlayerId, charges: Charge[], then: Continuation) {
  const total = sum(charges);
  if (total <= 0) return cont(s, then);
  if (getPlayer(s, pid).money >= total) {
    applyCharges(s, pid, charges);
    cont(s, then);
  } else {
    s.pending = { type: 'DEBT', debtor: pid, charges, then };
    addLog(s, { kind: 'event', player: pid, text: `⚠ ${nationName(pid)} 자금 부족: ${won(total)} 납부 필요` });
  }
}

function applyCharges(s: GameState, pid: PlayerId, charges: Charge[]) {
  const p = getPlayer(s, pid);
  for (const c of charges) {
    transfer(s, pid, c.to, c.amount, c.reason);
    if (c.loanRepay) p.loan = Math.max(0, p.loan - c.amount);
    if (c.colonyId) {
      p.tollPaid += c.amount;
      if (c.to !== 'BANK' && c.to !== 'CHINA_POOL') getPlayer(s, c.to).tollReceived += c.amount;
      if (s.colonies[c.colonyId]) s.colonies[c.colonyId].earned += c.amount;
    }
  }
}

/** 말 이동. 출발을 지날 때마다 바퀴 수 +1, 통행료·대출 상환 청구서를 돌려준다 */
function moveSteps(s: GameState, p: PlayerState, steps: number, kind: 'dice' | 'jump'): Charge[] {
  const from = p.position;
  const path: number[] = [];
  let passes = 0;
  for (let i = 1; i <= steps; i++) {
    const pos = (from + i) % BOARD_SIZE;
    path.push(pos);
    if (pos === 0) passes++;
  }
  p.position = path.length ? path[path.length - 1] : from;
  s.move = { seq: s.move.seq + 1, player: p.id, from, path, kind, passes };

  const charges: Charge[] = [];
  let loanLeft = p.loan;
  for (let i = 0; i < passes; i++) {
    p.lap += 1;
    addLog(s, { kind: 'event', player: p.id, text: `🏁 ${nationName(p.id)} 출발 통과 (${p.lap}바퀴 완료)` });
    charges.push({ to: 'BANK', amount: s.settings.passStartToll, reason: '출발 통행료' });
    if (loanLeft > 0) {
      const r = Math.min(s.settings.loanRepayment, loanLeft);
      loanLeft -= r;
      charges.push({ to: 'BANK', amount: r, reason: '대출 상환', loanRepay: true });
    }
  }
  return charges;
}

function resolveTile(s: GameState) {
  const p = currentPlayer(s);
  const tile = BOARD[p.position];
  switch (tile.kind) {
    case 'start':
      notice(s, { tone: 'info', icon: '🏁', title: '출발', lines: ['출발 칸에 멈췄습니다.'], then: 'END_TURN' });
      return;
    case 'colony': {
      const id = tile.colonyId as string;
      const c = s.colonies[id];
      const col = COLONIES[id];
      if (!c.owner) { s.pending = { type: 'BUY', colonyId: id }; return; }
      if (c.owner === p.id) {
        if (c.stage >= col.stages.length - 1) {
          notice(s, { tone: 'info', icon: '🏛', title: `${col.name} (내 식민지)`, lines: ['이미 최고 단계까지 식민화가 진행되었습니다.'], then: 'END_TURN' });
        } else if (c.lastDevelopedLap === p.lap) {
          notice(s, { tone: 'info', icon: '⏳', title: `${col.name} (내 식민지)`, lines: ['이번 바퀴에는 이미 식민화를 진행했습니다. (1바퀴에 1단계씩)'], then: 'END_TURN' });
        } else s.pending = { type: 'DEVELOP', colonyId: id };
        return;
      }
      makeToll(s, p, id, c.owner, col.stages[c.stage].toll);
      return;
    }
    case 'ethiopia': {
      const t = SPECIAL_TILES.ethiopia;
      notice(s, { tone: 'history', icon: '☕', title: t.name, lines: [t.text], note: `독립 유지: ${t.historyNote}`,
        charges: [{ to: 'BANK', amount: t.fee, reason: '에티오피아 커피교역 값' }], then: 'END_TURN' });
      return;
    }
    case 'china': {
      const t = SPECIAL_TILES.china;
      notice(s, { tone: 'history', icon: '🏯', title: t.name, lines: [t.text], note: t.historyNote,
        charges: [{ to: 'CHINA_POOL', amount: t.fee, reason: '중국 공동 식민통치기구 납부' }], then: 'END_TURN' });
      return;
    }
    case 'liberia': {
      const t = SPECIAL_TILES.liberia;
      p.skipTurns = t.skipTurns;
      addLog(s, { kind: 'event', player: p.id, text: `⛓ ${nationName(p.id)} 라이베리아 도착 — ${t.skipTurns}턴 이동 불가` });
      notice(s, { tone: 'history', icon: '🗽', title: t.name, lines: [t.text], note: `독립 유지: ${t.historyNote}`, then: 'END_TURN' });
      return;
    }
    case 'siam': {
      const t = SPECIAL_TILES.siam;
      const d = nearestOwnColony(s, p);
      notice(s, {
        tone: 'history', icon: '🐘', title: t.name,
        lines: [t.text, d ? `→ 가장 가까운 내 식민지 ${tileName((p.position + d) % BOARD_SIZE)}(으)로 이동합니다.` : '→ 보유한 식민지가 없어 제자리에 머뭅니다.'],
        note: `독립 유지: ${t.historyNote}`, then: d ? 'SIAM_JUMP' : 'END_TURN',
      });
      return;
    }
    case 'fashoda': {
      const f = s.fashoda;
      if (!f.owner && !f.occupied && p.id === 'UK') s.pending = { type: 'FASHODA_OFFER' };
      else if (f.owner && f.owner !== p.id) makeToll(s, p, 'fashoda', f.owner, SPECIAL_TILES.fashoda.toll);
      else drawKey(s);
      return;
    }
  }
}

function makeToll(s: GameState, p: PlayerState, colonyId: string, owner: PlayerId, base: number) {
  const allied = isAllied(s, p.id, owner);
  s.pending = { type: 'PAY_TOLL', colonyId, owner, baseAmount: base, allied, amount: allied ? Math.ceil(base / 2) : base };
}

function nearestOwnColony(s: GameState, p: PlayerState): number {
  for (let d = 1; d < BOARD_SIZE; d++) {
    const t = BOARD[(p.position + d) % BOARD_SIZE];
    if (t.kind === 'colony' && s.colonies[t.colonyId as string].owner === p.id) return d;
  }
  return 0;
}

function siamJump(s: GameState) {
  const p = currentPlayer(s);
  const d = nearestOwnColony(s, p);
  if (!d) return endTurn(s);
  addLog(s, { kind: 'event', player: p.id, text: `🐘 시암 → ${tileName((p.position + d) % BOARD_SIZE)}(으)로 이동` });
  const charges = moveSteps(s, p, d, 'jump');
  processCharges(s, p.id, charges, 'START_DEV');
}

function sellColony(s: GameState, pid: PlayerId, cid: string): number {
  const c = s.colonies[cid];
  const price = Math.floor(c.invested * s.settings.sellRatio);
  transfer(s, 'BANK', pid, price, `${COLONIES[cid].name} 매각`);
  s.colonies[cid] = { ...emptyColony(), earned: c.earned, everOwned: c.everOwned };
  return price;
}

function conquer(s: GameState, attacker: PlayerId, cid: string, declined: boolean) {
  const c = s.colonies[cid];
  const loser = c.owner!;
  c.owner = attacker;
  c.lastDevelopedLap = getPlayer(s, attacker).lap;
  if (!c.everOwned.includes(attacker)) c.everOwned.push(attacker);
  const col = COLONIES[cid];
  addLog(s, { kind: 'key', player: attacker, text: `⚔ ${nationName(attacker)}이(가) ${nationName(loser)}의 ${col.name}을(를) 빼앗음 (${col.stages[c.stage].name} 그대로)` });
  notice(s, {
    tone: 'bad', icon: '⚔', title: `${col.name} 점령`,
    lines: [`${declined ? '방어하지 않아' : '방어카드가 없어'} ${nationName(loser)}의 ${col.name}이(가) ${nationName(attacker)}에게 넘어갔습니다.`,
      `식민화 단계(${col.stages[c.stage].name})는 그대로 유지됩니다.`],
    note: '지배국이 바뀌어도 그 땅에 사는 사람들의 삶은 나아졌을까?',
    then: 'RESUME',
  });
}

function discardCard(s: GameState, p: PlayerState, cardId: string) {
  p.heldCards = p.heldCards.filter((id) => id !== cardId);
  s.discard.push(cardId);
}

function takeCard(s: GameState): string | null {
  if (!s.deck.length) {
    if (!s.discard.length) return null;
    s.deck = shuffle(s, s.discard);
    s.discard = [];
    addLog(s, { kind: 'key', text: '🔄 사용한 황금열쇠를 다시 섞었습니다' });
  }
  return s.deck.pop() ?? null;
}

function drawKey(s: GameState) {
  if (s.settings.quizEnabled) {
    s.pending = { type: 'QUIZ', quizId: QUIZZES[randInt(s, 0, QUIZZES.length - 1)].id };
    return;
  }
  drawOne(s);
}

function drawOne(s: GameState) {
  const id = takeCard(s);
  if (id) applyDrawn(s, id);
  else noKeys(s);
}

function noKeys(s: GameState) {
  notice(s, { tone: 'info', icon: '🔑', title: '황금열쇠', lines: ['남은 황금열쇠가 없습니다. (모두 각 나라가 보관 중)'], then: 'END_TURN' });
}

function applyDrawn(s: GameState, id: string) {
  const p = currentPlayer(s);
  const k = keyById(id);
  // 카드 내용은 뽑은 나라만 본다 → 공개 기록에는 종류를 남기지 않음 (사용할 때 공개됨)
  addLog(s, { kind: 'key', player: p.id, text: `🔑 ${nationName(p.id)}, 황금열쇠를 뽑았습니다` });
  if (k.holdable) {
    p.heldCards.push(id);
    s.pending = { type: 'KEY_DRAWN', cardId: id, kept: true };
    return;
  }
  if (k.effect === 'EXPLOIT') transfer(s, 'BANK', p.id, k.gain ?? 0, '착취 강화');
  if (k.effect === 'LOAN') {
    transfer(s, 'BANK', p.id, k.gain ?? 0, '국제은행 대출');
    p.loan += k.gain ?? 0;
  }
  s.discard.push(id);
  s.pending = { type: 'KEY_DRAWN', cardId: id, kept: false };
}

function endTurn(s: GameState) {
  s.pending = null;
  const ended = s.alliances.filter((al) => getPlayer(s, al.a).lap >= al.endLap);
  for (const al of ended) addLog(s, { kind: 'key', text: `🤝 ${nationName(al.a)}–${nationName(al.b)} 동맹 기간 종료` });
  s.alliances = s.alliances.filter((al) => !ended.includes(al));

  const alive = s.players.filter((x) => !x.bankrupt);
  if (alive.length <= 1) return finish(s, 'LAST_STANDING');
  if (s.timeUp) return finish(s, 'TIME_UP');
  let i = s.currentIdx;
  do i = (i + 1) % s.players.length;
  while (s.players[i].bankrupt);
  s.currentIdx = i;
  s.turn += 1;
  addLog(s, { kind: 'turn', player: s.players[i].id, text: `— ${s.turn}번째 차례: ${nationName(s.players[i].id)} —` });
}

function finish(s: GameState, reason: 'LAST_STANDING' | 'TIME_UP') {
  s.pending = null;
  s.phase = 'GAME_OVER';
  s.ranking = computeRanking(s);
  s.winner = s.ranking[0].id;
  s.endReason = reason;
  addLog(s, { kind: 'event', player: s.winner, text: `🏆 게임 종료 — ${nationName(s.winner)} 승리 (${reason === 'TIME_UP' ? '총자산 1위' : '마지막 생존국'})` });
}
