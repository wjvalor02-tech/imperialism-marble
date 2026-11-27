import { emptyColony } from './setup';
import { accountName, getPlayer, josa, nationName, won } from './selectors';
import type { Account, GameState, LogEntry, PlayerId } from './types';

export function addLog(s: GameState, entry: Omit<LogEntry, 'id' | 'turn'>) {
  s.logSeq += 1;
  s.log.push({ id: s.logSeq, turn: s.turn, ...entry, text: josa(entry.text) });
  if (s.log.length > 600) s.log.splice(0, s.log.length - 600);
}

/**
 * 모든 금전 이동은 이 함수만 사용한다. 잔액 검사는 호출 측 책임
 * (필수 납부는 reducer의 processCharges가 DEBT 흐름으로 처리).
 */
export function transfer(s: GameState, from: Account, to: Account, amount: number, reason: string) {
  if (amount <= 0) return;
  if (from !== 'BANK' && from !== 'CHINA_POOL') {
    const p = getPlayer(s, from);
    if (p.money < amount) throw new Error(`${from} 잔액 부족: ${p.money} < ${amount}`);
    p.money -= amount;
  }
  if (to === 'CHINA_POOL') s.chinaPool += amount;
  else if (to !== 'BANK') getPlayer(s, to).money += amount;
  addLog(s, {
    kind: 'money', from, to, amount,
    player: from !== 'BANK' && from !== 'CHINA_POOL' ? from : (to as PlayerId),
    text: `${accountName(from)} → ${accountName(to)} ${won(amount)} (${reason})`,
  });
}

/** 파산 처리: 남은 현금은 채권국(없으면 은행)으로, 식민지는 은행으로 반환 */
export function declareBankrupt(s: GameState, id: PlayerId, creditor: Account) {
  const p = getPlayer(s, id);
  if (p.bankrupt) return;
  if (p.money > 0) {
    const to: Account = creditor !== 'CHINA_POOL' && creditor !== 'BANK' && !getPlayer(s, creditor).bankrupt ? creditor : 'BANK';
    transfer(s, id, to, p.money, '파산 정리');
  }
  for (const [cid, c] of Object.entries(s.colonies)) {
    if (c.owner === id) {
      const earned = c.earned;
      const ever = c.everOwned;
      s.colonies[cid] = { ...emptyColony(), earned, everOwned: ever };
    }
  }
  if (s.fashoda.owner === id) s.fashoda.owner = null;
  s.discard.push(...p.heldCards);
  p.heldCards = [];
  p.loan = 0;
  p.skipTurns = 0;
  p.bankrupt = true;
  s.alliances = s.alliances.filter((a) => a.a !== id && a.b !== id);
  s.bankruptOrder.push(id);
  addLog(s, { kind: 'event', player: id, text: `💥 ${nationName(id)} 파산! 식민지는 모두 국제은행으로 돌아갑니다.` });
}
