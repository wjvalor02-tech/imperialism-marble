import { BOARD, COLONIES, GOLDEN_KEYS, NATIONS, SPECIAL_TILES, RULES } from '../data/gameData';
import type { Account, GameState, PlayerId, PlayerState, RankRow } from './types';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}만원`;

/** '프랑스이(가)' → '프랑스가', '영국은(는)' → '영국은' 처럼 앞 글자 받침에 맞춰 조사를 고른다 */
export function josa(text: string): string {
  return text.replace(/([가-힣])(이\(가\)|은\(는\)|을\(를\)|과\(와\)|\(으\)로)/g, (_, ch: string, p: string) => {
    const jong = (ch.charCodeAt(0) - 0xac00) % 28;
    const has = jong !== 0;
    const pick =
      p === '(으)로' ? (has && jong !== 8 ? '으로' : '로')
        : p === '이(가)' ? (has ? '이' : '가')
          : p === '은(는)' ? (has ? '은' : '는')
            : p === '을(를)' ? (has ? '을' : '를')
              : has ? '과' : '와';
    return ch + pick;
  });
}
export const nationName = (id: PlayerId) => NATIONS[id].name;
export const accountName = (a: Account) =>
  a === 'BANK' ? '국제은행' : a === 'CHINA_POOL' ? '중국 공동 식민통치기구' : NATIONS[a].name;

export const keyById = (id: string) => {
  const k = GOLDEN_KEYS.find((g) => g.id === id);
  if (!k) throw new Error(`unknown key ${id}`);
  return k;
};

export const KEY_TITLES: Record<string, string> = {
  WAR: '전쟁', SELL_COLONY: '식민지 매각', SABOTAGE: '중요시설 파괴', EXPLOIT: '착취 강화',
  TOLL_EXEMPT: '무역대금 면제', DEFENSE: '방어', ALLIANCE: '동맹', LOAN: '대출',
};
export const keyTitle = (id: string) => KEY_TITLES[keyById(id).effect];

export function getPlayer(s: GameState, id: PlayerId): PlayerState {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
}
export const hasPlayer = (s: GameState, id: PlayerId) => s.players.some((p) => p.id === id);
export const currentPlayer = (s: GameState) => s.players[s.currentIdx];

/** 지금 결정을 내려야 하는 나라 (방어·동맹 응답, 부채 처리는 차례가 아닌 나라일 수 있음) */
export function actorOf(s: GameState): PlayerId {
  const pd = s.pending;
  if (pd?.type === 'DEFENSE_PROMPT') return pd.defender;
  if (pd?.type === 'ALLIANCE_PROMPT') return pd.to;
  if (pd?.type === 'DEBT') return pd.debtor;
  return currentPlayer(s).id;
}
export const alivePlayers = (s: GameState) => s.players.filter((p) => !p.bankrupt);

export function tileName(index: number): string {
  const t = BOARD[index];
  if (t.kind === 'start') return '출발';
  if (t.kind === 'colony') return COLONIES[t.colonyId].name;
  return SPECIAL_TILES[t.kind].name;
}

export const colonyToll = (s: GameState, colonyId: string) =>
  COLONIES[colonyId].stages[s.colonies[colonyId].stage].toll;

export function investmentFor(colonyId: string, stage: number): number {
  return COLONIES[colonyId].stages.slice(0, stage + 1).reduce((sum, st) => sum + st.cost, 0);
}

export function ownedColonies(s: GameState, id: PlayerId): string[] {
  return Object.keys(s.colonies).filter((c) => s.colonies[c].owner === id);
}

export function isAllied(s: GameState, x: PlayerId, y: PlayerId): boolean {
  return s.alliances.some((a) => (a.a === x && a.b === y) || (a.a === y && a.b === x));
}

export function allianceOf(s: GameState, id: PlayerId) {
  return s.alliances.find((a) => a.a === id || a.b === id);
}

/** 총자산(현금 + 식민지 투자액 − 대출)과 식민지 점수(승리 기준) */
export function assetRow(s: GameState, p: PlayerState): RankRow {
  const cols = ownedColonies(s, p.id);
  const fashoda = s.fashoda.owner === p.id;
  let investment = cols.reduce((sum, c) => sum + s.colonies[c].invested, 0);
  if (fashoda) investment += SPECIAL_TILES.fashoda.price;
  const stages = cols.reduce((sum, c) => sum + s.colonies[c].stage, 0);
  const v = RULES.victoryScore;
  return {
    id: p.id, cash: p.money, investment, loan: p.loan,
    total: p.bankrupt ? 0 : p.money + investment - p.loan,
    colonies: cols.length, stages, fashoda,
    score: p.bankrupt ? 0 : cols.length * v.perColony + stages * v.perStage + (fashoda ? v.fashoda : 0),
    bankrupt: p.bankrupt,
  };
}

/** 순위: 식민지 점수 → 현금 − 대출 → 총자산. 파산국은 늦게 파산한 순서로 뒤에 */
export function computeRanking(s: GameState): RankRow[] {
  const alive = alivePlayers(s).map((p) => assetRow(s, p));
  alive.sort((a, b) => b.score - a.score || (b.cash - b.loan) - (a.cash - a.loan) || b.total - a.total);
  const dead = [...s.bankruptOrder].reverse().map((id) => assetRow(s, getPlayer(s, id)));
  return [...alive, ...dead];
}
