import { describe, expect, it } from 'vitest';
import { COLONIES, GOLDEN_KEYS, SPECIAL_TILES } from '../../data/gameData';
import { QUIZZES } from '../../data/quiz';
import { reduce } from '../reducer';
import { nextRandom } from '../rng';
import { computeRanking, getPlayer } from '../selectors';
import { createGame } from '../setup';
import type { Action, GameState, PlayerId } from '../types';

const ALL: PlayerId[] = ['UK', 'FRANCE', 'GERMANY', 'USA'];
// 테스트는 원래 규칙 수치(주사위 1개, 500만원, 식민지 수입·개발 수 제한·더블 없음)로 시나리오를 검증한다
const BASE = { diceCount: 1, startingMoney: 500, colonyIncome: 0, startDevelopLimit: 0, doubleRollAgain: false };
// 새 규칙(주사위 2개, 더블, 식민지 수입, 1곳 개발) 시나리오용
const NEW = { startingMoney: 500 };
const newGame = () => createGame(ALL, BASE, 42);
const keyId = (effect: string, nth = 0) => GOLDEN_KEYS.filter((k) => k.effect === effect)[nth].id;

/** 다음 주사위가 `face`가 되도록 시드를 맞춘다 */
function forceDie(s: GameState, face: number) {
  for (let seed = 1; ; seed++) {
    const [v] = nextRandom(seed);
    if (1 + Math.floor(v * 6) === face) { s.rngSeed = seed; return; }
  }
}
/** 다음 주사위 2개가 (a, b)가 되도록 시드를 맞춘다 */
function forceDice(s: GameState, a: number, b: number) {
  for (let seed = 1; ; seed++) {
    const [v1, n1] = nextRandom(seed);
    const [v2] = nextRandom(n1);
    if (1 + Math.floor(v1 * 6) === a && 1 + Math.floor(v2 * 6) === b) { s.rngSeed = seed; return; }
  }
}
function roll2(s: GameState, a: number, b: number) {
  const c = structuredClone(s);
  forceDice(c, a, b);
  return act(c, { type: 'ROLL_DICE' });
}
function act(s: GameState, a: Action): GameState {
  const n = reduce(s, a);
  if (n === s) throw new Error(`invalid action ${a.type} (pending=${s.pending?.type})`);
  return n;
}
function roll(s: GameState, face: number) {
  const c = structuredClone(s);
  forceDie(c, face);
  return act(c, { type: 'ROLL_DICE' });
}
const own = (s: GameState, cid: string, owner: PlayerId, stage = 0) => {
  s.colonies[cid].owner = owner;
  s.colonies[cid].stage = stage;
  s.colonies[cid].invested = COLONIES[cid].stages.slice(0, stage + 1).reduce((x, y) => x + y.cost, 0);
};
const money = (s: GameState, id: PlayerId) => getPlayer(s, id).money;

describe('식민지 확보와 무역대금', () => {
  it('주인 없는 식민지를 확보한다', () => {
    let s = roll(newGame(), 1); // 모로코
    expect(s.pending).toEqual({ type: 'BUY', colonyId: 'morocco' });
    s = act(s, { type: 'BUY_COLONY' });
    expect(s.colonies.morocco.owner).toBe('UK');
    expect(money(s, 'UK')).toBe(500 - 35);
    expect(s.pending?.type).toBe('NOTICE'); // 역사 카드
    s = act(s, { type: 'ACK' });
    expect(s.players[s.currentIdx].id).toBe('FRANCE');
  });

  it('남의 식민지에 서면 현재 단계 무역대금을 낸다', () => {
    let s = newGame();
    own(s, 'egypt', 'FRANCE', 3); // 광산 1개 = 40만원
    s = roll(s, 2);
    expect(s.pending).toMatchObject({ type: 'PAY_TOLL', amount: 40, owner: 'FRANCE' });
    s = act(s, { type: 'PAY_TOLL', useExempt: false });
    expect(money(s, 'UK')).toBe(460);
    expect(money(s, 'FRANCE')).toBe(540);
    expect(getPlayer(s, 'FRANCE').tollReceived).toBe(40);
    expect(s.colonies.egypt.earned).toBe(40);
  });

  it('무역대금 면제권을 쓰면 내지 않고 카드가 소멸한다', () => {
    let s = newGame();
    own(s, 'egypt', 'FRANCE', 3);
    getPlayer(s, 'UK').heldCards = [keyId('TOLL_EXEMPT')];
    s = roll(s, 2);
    s = act(s, { type: 'PAY_TOLL', useExempt: true });
    expect(money(s, 'UK')).toBe(500);
    expect(getPlayer(s, 'UK').heldCards).toEqual([]);
    expect(s.discard).toContain(keyId('TOLL_EXEMPT'));
  });
});

describe('식민화 단계', () => {
  it('같은 바퀴에 두 번 개발할 수 없다', () => {
    let s = newGame();
    own(s, 'morocco', 'UK', 0);
    s.colonies.morocco.lastDevelopedLap = 0; // 이번 바퀴(0)에 확보
    s = roll(s, 1);
    expect(s.pending?.type).toBe('NOTICE');
    expect((s.pending as { lines: string[] }).lines[0]).toContain('이번 바퀴');
  });

  it('다음 바퀴에는 1단계 개발할 수 있다', () => {
    let s = newGame();
    own(s, 'morocco', 'UK', 0);
    s.colonies.morocco.lastDevelopedLap = 0;
    getPlayer(s, 'UK').lap = 1;
    s = roll(s, 1);
    expect(s.pending).toEqual({ type: 'DEVELOP', colonyId: 'morocco' });
    s = act(s, { type: 'DEVELOP_COLONY' });
    expect(s.colonies.morocco.stage).toBe(1);
    expect(s.colonies.morocco.invested).toBe(55);
    expect(money(s, 'UK')).toBe(480);
  });

  it('광산은 두 번 개발한다 (40 → 80만원)', () => {
    let s = newGame();
    own(s, 'morocco', 'UK', 2);
    getPlayer(s, 'UK').lap = 1;
    s = roll(s, 1);
    s = act(s, { type: 'DEVELOP_COLONY' });
    expect(COLONIES.morocco.stages[s.colonies.morocco.stage]).toMatchObject({ name: '광산 개발(1개)', toll: 40 });
    s = act(s, { type: 'ACK' });
    // 다음 바퀴에 다시 도착
    const uk = getPlayer(s, 'UK');
    uk.lap = 2; uk.position = 0;
    s.currentIdx = 0;
    s = roll(s, 1);
    s = act(s, { type: 'DEVELOP_COLONY' });
    expect(COLONIES.morocco.stages[s.colonies.morocco.stage]).toMatchObject({ name: '광산 개발(2개)', toll: 80 });
  });
});

describe('출발·대출', () => {
  it('출발을 지나면 통행료 10만원을 내고 바퀴 수가 오른다', () => {
    let s = newGame();
    getPlayer(s, 'UK').position = 22;
    s = roll(s, 3); // 22 → 1 (모로코)
    expect(getPlayer(s, 'UK').lap).toBe(1);
    expect(money(s, 'UK')).toBe(490);
    expect(s.pending).toEqual({ type: 'BUY', colonyId: 'morocco' });
  });

  it('대출은 출발 통과 때마다 50만원씩 상환된다', () => {
    let s = newGame();
    const uk = getPlayer(s, 'UK');
    uk.position = 22; uk.loan = 500; uk.money = 1000;
    s = roll(s, 3);
    expect(getPlayer(s, 'UK').loan).toBe(450);
    expect(money(s, 'UK')).toBe(1000 - 10 - 50);
  });

  it('대출 카드를 뽑으면 500만원을 받는다', () => {
    let s = newGame();
    s.deck = [keyId('LOAN')];
    s.discard = [];
    getPlayer(s, 'USA').position = 8;
    s.currentIdx = 3;
    s = roll(s, 1); // 파쇼다, 영국 아님 → 황금열쇠
    expect(s.pending).toMatchObject({ type: 'KEY_DRAWN', kept: false });
    expect(money(s, 'USA')).toBe(1000);
    expect(getPlayer(s, 'USA').loan).toBe(500);
  });
});

describe('특수칸', () => {
  it('라이베리아: 3턴 쉬고 다음 턴에 움직인다', () => {
    let s = newGame();
    getPlayer(s, 'UK').position = 17;
    s = roll(s, 1);
    s = act(s, { type: 'ACK' });
    expect(getPlayer(s, 'UK').skipTurns).toBe(3);
    for (let i = 0; i < 3; i++) {
      s.currentIdx = 0;
      expect(reduce(s, { type: 'ROLL_DICE' })).toBe(s); // 굴릴 수 없음
      s = act(s, { type: 'LIBERIA_WAIT' });
    }
    s.currentIdx = 0;
    expect(getPlayer(s, 'UK').skipTurns).toBe(0);
    s = roll(s, 1);
    expect(getPlayer(s, 'UK').position).toBe(19);
  });

  it('라이베리아(주사위 2개): 더블이 아니면 한 턴 소모, 더블이면 바로 탈출해 이동', () => {
    let s = createGame(ALL, NEW, 3);
    getPlayer(s, 'UK').skipTurns = 3;
    getPlayer(s, 'UK').position = 18;
    s = roll2(s, 1, 2);
    expect(getPlayer(s, 'UK').skipTurns).toBe(2);
    expect(getPlayer(s, 'UK').position).toBe(18);
    expect(s.pending).toMatchObject({ type: 'NOTICE', title: '라이베리아 탈출 실패' });
    s = act(s, { type: 'ACK' });
    expect(s.players[s.currentIdx].id).toBe('FRANCE');
    s.currentIdx = 0;
    s = roll2(s, 2, 2); // 더블 → 탈출, 4칸
    expect(getPlayer(s, 'UK').skipTurns).toBe(0);
    expect(getPlayer(s, 'UK').position).toBe(22);
    expect(s.bonusRoll).toBe(false); // 탈출 더블은 추가 굴림 없음
  });

  it('시암: 앞쪽으로 가장 가까운 내 식민지로 이동해 그 칸을 처리', () => {
    let s = newGame();
    own(s, 'indonesia', 'UK'); // 16번 칸
    own(s, 'morocco', 'UK');
    getPlayer(s, 'UK').lap = 1;
    getPlayer(s, 'UK').position = 11;
    s = roll(s, 1); // 시암
    expect(s.pending).toMatchObject({ type: 'NOTICE', then: 'SIAM_JUMP' });
    s = act(s, { type: 'ACK' });
    expect(getPlayer(s, 'UK').position).toBe(16);
    expect(s.move.kind).toBe('jump');
    expect(s.pending).toEqual({ type: 'DEVELOP', colonyId: 'indonesia' });
  });

  it('시암: 식민지가 없으면 제자리', () => {
    let s = newGame();
    getPlayer(s, 'UK').position = 11;
    s = roll(s, 1);
    s = act(s, { type: 'ACK' });
    expect(getPlayer(s, 'UK').position).toBe(12);
    expect(s.currentIdx).toBe(1);
  });

  it('에티오피아 50만원, 중국 20만원(공동기구 적립)', () => {
    let s = newGame();
    getPlayer(s, 'UK').position = 5;
    s = roll(s, 1);
    s = act(s, { type: 'ACK' });
    expect(money(s, 'UK')).toBe(450);
    getPlayer(s, 'FRANCE').position = 20;
    s.deck = [keyId('WAR')];
    s.discard = [];
    s = roll(s, 1);
    s = act(s, { type: 'ACK' });
    expect(money(s, 'FRANCE')).toBe(480);
    expect(s.chinaPool).toBe(20);
    // 중국 칸: 납부 후 황금열쇠를 뽑는다
    expect(s.pending).toMatchObject({ type: 'KEY_DRAWN', cardId: keyId('WAR'), kept: true });
    expect(getPlayer(s, 'FRANCE').heldCards).toEqual([keyId('WAR')]);
  });

  it('중국 칸에서 돈이 모자라 파산하면 황금열쇠는 뽑지 않는다', () => {
    let s = newGame();
    getPlayer(s, 'UK').position = 20;
    getPlayer(s, 'UK').money = 10;
    s = roll(s, 1);
    s = act(s, { type: 'ACK' });
    expect(s.pending?.type).toBe('DEBT');
    s = act(s, { type: 'DECLARE_BANKRUPTCY' });
    expect(getPlayer(s, 'UK').bankrupt).toBe(true);
    expect(s.pending).toBeNull();
  });

  it('파쇼다: 영국은 프랑스에 200만원을 주고 점령, 이후 다른 나라는 100만원', () => {
    let s = newGame();
    getPlayer(s, 'UK').position = 8;
    s = roll(s, 1);
    expect(s.pending?.type).toBe('FASHODA_OFFER');
    s = act(s, { type: 'FASHODA', accept: true });
    expect(s.fashoda.owner).toBe('UK');
    expect(money(s, 'UK')).toBe(300);
    expect(money(s, 'FRANCE')).toBe(700);
    s = act(s, { type: 'ACK' });
    getPlayer(s, 'FRANCE').position = 8;
    s = roll(s, 1);
    expect(s.pending).toMatchObject({ type: 'PAY_TOLL', amount: SPECIAL_TILES.fashoda.toll, owner: 'UK' });
  });

  it('파쇼다: 영국이 아니면 황금열쇠', () => {
    let s = newGame();
    s.currentIdx = 1;
    getPlayer(s, 'FRANCE').position = 8;
    s.deck = [keyId('WAR')];
    s = roll(s, 1);
    expect(s.pending).toMatchObject({ type: 'KEY_DRAWN', kept: true });
    expect(getPlayer(s, 'FRANCE').heldCards).toEqual([keyId('WAR')]);
  });

  it('퀴즈를 맞히면 황금열쇠 2장 중 고른다', () => {
    let s = createGame(ALL, { ...BASE, quizEnabled: true }, 7);
    s.currentIdx = 1;
    getPlayer(s, 'FRANCE').position = 8;
    s = roll(s, 1);
    expect(s.pending?.type).toBe('QUIZ');
    const q = QUIZZES.find((x) => x.id === (s.pending as { quizId: string }).quizId)!;
    s = act(s, { type: 'ANSWER_QUIZ', answer: q.answer });
    expect(s.pending?.type).toBe('KEY_CHOICE');
    const [a] = (s.pending as { cardIds: string[] }).cardIds;
    s = act(s, { type: 'CHOOSE_KEY', cardId: a });
    expect(s.deck.length + s.discard.length + getPlayer(s, 'FRANCE').heldCards.length).toBe(10);
  });
});

describe('황금열쇠: 전쟁·방어·파괴·매각·동맹', () => {
  it('방어카드가 없으면 식민지를 단계 그대로 빼앗는다', () => {
    let s = newGame();
    own(s, 'india', 'FRANCE', 3);
    getPlayer(s, 'UK').heldCards = [keyId('WAR')];
    s = act(s, { type: 'USE_KEY', cardId: keyId('WAR'), targetColonyId: 'india' });
    expect(s.colonies.india).toMatchObject({ owner: 'UK', stage: 3 });
    expect(money(s, 'UK')).toBe(300);
    s = act(s, { type: 'ACK' });
    expect(s.pending).toBeNull(); // 아직 영국 차례, 주사위 굴리기 전
    expect(s.currentIdx).toBe(0);
  });

  it('방어카드로 막으면 전쟁비용만 잃는다', () => {
    let s = newGame();
    own(s, 'india', 'FRANCE', 3);
    getPlayer(s, 'UK').heldCards = [keyId('WAR')];
    getPlayer(s, 'FRANCE').heldCards = [keyId('DEFENSE')];
    s = act(s, { type: 'USE_KEY', cardId: keyId('WAR'), targetColonyId: 'india' });
    expect(s.pending).toMatchObject({ type: 'DEFENSE_PROMPT', defender: 'FRANCE' });
    s = act(s, { type: 'RESPOND_DEFENSE', defend: true });
    expect(s.colonies.india.owner).toBe('FRANCE');
    expect(money(s, 'UK')).toBe(300);
    expect(money(s, 'FRANCE')).toBe(300);
    expect(getPlayer(s, 'FRANCE').heldCards).toEqual([]);
  });

  it('중요시설 파괴는 단계를 1 낮춘다', () => {
    let s = newGame();
    own(s, 'egypt', 'FRANCE', 4);
    getPlayer(s, 'UK').heldCards = [keyId('SABOTAGE')];
    s = act(s, { type: 'USE_KEY', cardId: keyId('SABOTAGE'), targetColonyId: 'egypt' });
    expect(s.colonies.egypt.stage).toBe(3);
    expect(s.colonies.egypt.invested).toBe(50 + 20 + 30 + 50);
    expect(money(s, 'UK')).toBe(400);
  });

  it('식민지 매각은 투자액의 50%', () => {
    let s = newGame();
    own(s, 'egypt', 'UK', 1); // 70
    getPlayer(s, 'UK').heldCards = [keyId('SELL_COLONY')];
    s = act(s, { type: 'USE_KEY', cardId: keyId('SELL_COLONY'), targetColonyId: 'egypt' });
    expect(s.colonies.egypt.owner).toBeNull();
    expect(money(s, 'UK')).toBe(535);
  });

  it('동맹 중에는 서로 무역대금이 절반', () => {
    let s = newGame();
    own(s, 'egypt', 'FRANCE', 3); // 40
    getPlayer(s, 'UK').heldCards = [keyId('ALLIANCE')];
    s = act(s, { type: 'USE_KEY', cardId: keyId('ALLIANCE'), targetPlayer: 'FRANCE' });
    s = act(s, { type: 'RESPOND_ALLIANCE', accept: true });
    s = act(s, { type: 'ACK' });
    s = roll(s, 2);
    expect(s.pending).toMatchObject({ type: 'PAY_TOLL', amount: 20, allied: true });
  });

  it('동맹은 제안국이 2바퀴를 돌면 끝난다', () => {
    let s = newGame();
    s.alliances = [{ a: 'UK', b: 'FRANCE', endLap: 2 }];
    getPlayer(s, 'UK').lap = 1;
    getPlayer(s, 'UK').position = 23;
    s = roll(s, 1); // 출발 도착 → lap 2
    s = act(s, { type: 'ACK' });
    expect(s.alliances).toEqual([]);
  });
});

describe('파산과 승리', () => {
  it('돈이 모자라면 식민지를 팔고, 그래도 모자라면 파산', () => {
    let s = newGame();
    own(s, 'egypt', 'FRANCE', 5); // 160
    own(s, 'algeria', 'UK', 0); // 매각가 5
    getPlayer(s, 'UK').money = 100;
    s = roll(s, 2);
    s = act(s, { type: 'PAY_TOLL', useExempt: false });
    expect(s.pending?.type).toBe('DEBT');
    expect(reduce(s, { type: 'PAY_DEBT' })).toBe(s);
    s = act(s, { type: 'SELL_FOR_DEBT', colonyId: 'algeria' });
    expect(money(s, 'UK')).toBe(105);
    s = act(s, { type: 'DECLARE_BANKRUPTCY' });
    expect(getPlayer(s, 'UK').bankrupt).toBe(true);
    expect(money(s, 'FRANCE')).toBe(605); // 남은 현금은 채권국으로
    expect(s.players[s.currentIdx].id).toBe('FRANCE');
  });

  it('파산 후 식민지는 은행으로 돌아간다', () => {
    let s = newGame();
    own(s, 'egypt', 'FRANCE', 5);
    own(s, 'india', 'UK', 2);
    getPlayer(s, 'UK').money = 10;
    s = roll(s, 2);
    s = act(s, { type: 'PAY_TOLL', useExempt: false });
    s = act(s, { type: 'DECLARE_BANKRUPTCY' });
    expect(s.colonies.india.owner).toBeNull();
  });

  it('한 나라만 남으면 즉시 GAME_OVER', () => {
    let s = createGame(['UK', 'FRANCE'], BASE, 1);
    own(s, 'egypt', 'FRANCE', 5);
    getPlayer(s, 'UK').money = 10;
    s = roll(s, 2);
    s = act(s, { type: 'PAY_TOLL', useExempt: false });
    s = act(s, { type: 'DECLARE_BANKRUPTCY' });
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('FRANCE');
    s = act(s, { type: 'GO_REFLECTION' });
    expect(s.phase).toBe('REFLECTION');
  });

  it('TIME_UP: 진행 중인 차례를 마치고 식민지 점수 순위로 종료', () => {
    let s = newGame();
    own(s, 'india', 'GERMANY', 2); // 105
    getPlayer(s, 'GERMANY').money = 450; // 총자산 555
    getPlayer(s, 'USA').loan = 100; // 400
    s = roll(s, 1);
    s = act(s, { type: 'TIME_UP' });
    expect(s.phase).toBe('PLAYING');
    s = act(s, { type: 'SKIP' });
    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('GERMANY');
    const r = computeRanking(s);
    expect(r.find((x) => x.id === 'USA')!.total).toBe(400);
    expect(r[r.length - 1].id).toBe('USA');
  });

  it('식민지 점수 = 식민지 1점 + 단계마다 1점 + 파쇼다 3점', () => {
    const s = newGame();
    own(s, 'india', 'GERMANY', 2); // 1 + 2 = 3점
    own(s, 'algeria', 'FRANCE', 0);
    own(s, 'morocco', 'FRANCE', 1); // 1 + 2 = 3점
    s.fashoda.owner = 'UK'; // 3점
    own(s, 'congo', 'USA', 0); // 1점
    getPlayer(s, 'USA').money = 5000; // 돈이 많아도 점수가 낮으면 4위
    getPlayer(s, 'FRANCE').money = 300;
    getPlayer(s, 'UK').money = 280;
    getPlayer(s, 'GERMANY').money = 290;
    const r = computeRanking(s);
    expect(r.map((x) => [x.id, x.score])).toEqual([['FRANCE', 3], ['GERMANY', 3], ['UK', 3], ['USA', 1]]);
  });

  it('점수가 같으면 현금 − 대출이 많은 나라', () => {
    const s = newGame();
    own(s, 'algeria', 'USA', 0);
    own(s, 'morocco', 'UK', 0);
    getPlayer(s, 'UK').loan = 20; // 500 − 20
    getPlayer(s, 'USA').money = 490; // 490
    const r = computeRanking(s);
    expect(r[0].id).toBe('USA');
    expect(r[1].id).toBe('UK');
  });
});

describe('기타', () => {
  it('불가능한 액션은 상태를 바꾸지 않는다 (예: 돈 없이 확보)', () => {
    let s = newGame();
    getPlayer(s, 'UK').money = 5;
    s = roll(s, 1);
    expect(reduce(s, { type: 'BUY_COLONY' })).toBe(s);
  });

  it('수동 조정은 사유가 있어야 하고 로그에 남는다', () => {
    let s = newGame();
    expect(reduce(s, { type: 'HOST_ADJUST_MONEY', player: 'UK', delta: 50, reason: '' })).toBe(s);
    s = act(s, { type: 'HOST_ADJUST_MONEY', player: 'UK', delta: 50, reason: '보너스' });
    expect(money(s, 'UK')).toBe(550);
    expect(s.log.some((l) => l.kind === 'host')).toBe(true);
  });

  it('같은 시드면 같은 결과 (재현 가능)', () => {
    const a = reduce(createGame(ALL, BASE, 99), { type: 'ROLL_DICE' });
    const b = reduce(createGame(ALL, BASE, 99), { type: 'ROLL_DICE' });
    expect(a.lastRoll).toEqual(b.lastRoll);
    expect(a.deck).toEqual(b.deck);
  });
});

describe('출발 통과 시 일괄 개발 (밸런스 조정 규칙)', () => {
  const setup = () => {
    const s = newGame();
    own(s, 'egypt', 'UK', 0);
    own(s, 'india', 'UK', 1);
    own(s, 'congo', 'UK', 5); // 최고 단계 → 대상 아님
    s.colonies.egypt.lastDevelopedLap = 0;
    s.colonies.india.lastDevelopedLap = 0;
    getPlayer(s, 'UK').position = 22;
    return s;
  };

  it('출발을 지나면 개발할 수 있는 내 식민지를 고르게 한다', () => {
    const s = roll(setup(), 3); // 22 → 1 (모로코), 출발 통과
    expect(s.pending).toEqual({ type: 'START_DEVELOP', colonyIds: ['egypt', 'india'], then: 'RESOLVE_TILE' });
    expect(money(s, 'UK')).toBe(490); // 통행료는 먼저 냄
  });

  it('고른 식민지를 각각 1단계씩 올리고 도착 칸을 처리한다', () => {
    let s = roll(setup(), 3);
    s = act(s, { type: 'DEVELOP_MANY', colonyIds: ['egypt', 'india'] });
    expect(s.colonies.egypt.stage).toBe(1);
    expect(s.colonies.india.stage).toBe(2);
    expect(money(s, 'UK')).toBe(490 - 20 - 30);
    expect(s.pending).toEqual({ type: 'BUY', colonyId: 'morocco' });
  });

  it('같은 바퀴에 그 식민지에 도착해도 또 개발할 수 없다 (1바퀴 1단계)', () => {
    let t = setup();
    getPlayer(t, 'UK').position = 23;
    t = roll(t, 3); // 23 → 2 (이집트)
    t = act(t, { type: 'DEVELOP_MANY', colonyIds: ['egypt'] });
    expect(t.pending?.type).toBe('NOTICE');
    expect((t.pending as { lines: string[] }).lines[0]).toContain('이번 바퀴');
  });

  it('개발하지 않고 넘어갈 수 있다', () => {
    let s = roll(setup(), 3);
    s = act(s, { type: 'DEVELOP_MANY', colonyIds: [] });
    expect(s.colonies.egypt.stage).toBe(0);
    expect(s.pending).toEqual({ type: 'BUY', colonyId: 'morocco' });
  });

  it('돈이 모자라면 거부한다', () => {
    let s = setup();
    getPlayer(s, 'UK').money = 50;
    s = roll(s, 3); // 통행료 후 40
    expect(reduce(s, { type: 'DEVELOP_MANY', colonyIds: ['egypt', 'india'] })).toBe(s);
  });

  it('설정을 끄면 묻지 않는다 (원래 규칙)', () => {
    const s0 = setup();
    s0.settings.developOnPassStart = false;
    const s = roll(s0, 3);
    expect(s.pending).toEqual({ type: 'BUY', colonyId: 'morocco' });
  });
});

describe('새 규칙: 더블·1곳 개발·식민지 수입·순서 추첨·황금열쇠 비밀', () => {
  it('더블이면 같은 나라가 한 번 더, 아니면 다음 나라', () => {
    let s = createGame(ALL, NEW, 3);
    s = roll2(s, 2, 2); // 4칸: 알제리(빈 땅)
    expect(s.pending?.type).toBe('BUY');
    s = act(s, { type: 'SKIP' });
    expect(s.players[s.currentIdx].id).toBe('UK');
    expect(s.extraTurn).toBe(true);
    s = roll2(s, 1, 2);
    s = act(s, s.pending?.type === 'BUY' ? { type: 'SKIP' } : { type: 'ACK' });
    expect(s.players[s.currentIdx].id).toBe('FRANCE');
    expect(s.extraTurn).toBe(false);
  });

  it('출발을 지나면 식민지 1곳마다 10만원 수입 (통행료 10만원은 냄)', () => {
    let s = createGame(ALL, NEW, 3);
    own(s, 'egypt', 'UK', 1);
    own(s, 'india', 'UK', 1);
    getPlayer(s, 'UK').position = 22;
    s = roll2(s, 1, 2); // 22 → 1, 출발 통과
    expect(money(s, 'UK')).toBe(500 + 20 - 10);
  });

  it('출발 통과 개발은 1곳만 고를 수 있다', () => {
    let s = createGame(ALL, NEW, 3);
    own(s, 'egypt', 'UK', 1);
    own(s, 'india', 'UK', 1);
    getPlayer(s, 'UK').position = 22;
    s = roll2(s, 1, 2);
    expect(s.pending).toMatchObject({ type: 'START_DEVELOP' });
    expect(reduce(s, { type: 'DEVELOP_MANY', colonyIds: ['egypt', 'india'] })).toBe(s);
    s = act(s, { type: 'DEVELOP_MANY', colonyIds: ['india'] });
    expect(s.colonies.india.stage).toBe(2);
    expect(s.colonies.egypt.stage).toBe(1);
  });

  it('순서 추첨: 시작할 때 순서를 섞고 결과를 알려 준다', () => {
    const s = createGame(ALL, { ...NEW, randomOrder: true }, 11);
    expect(s.pending).toMatchObject({ type: 'NOTICE', title: '차례 순서 추첨 결과' });
    expect([...s.players.map((p) => p.id)].sort()).toEqual([...ALL].sort());
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => createGame(ALL, { randomOrder: true }, seed).players.map((p) => p.id).join()));
    expect(orders.size).toBeGreaterThan(1);
    const t = act(s, { type: 'ACK' });
    expect(t.pending).toBeNull();
  });

  it('착취·대출 카드의 돈 기록은 공개 화면에서 숨김(secret)', () => {
    let s = newGame();
    s.deck = [keyId('EXPLOIT')];
    s.discard = [];
    getPlayer(s, 'USA').position = 8;
    s.currentIdx = 3;
    s = roll(s, 1);
    const m = s.log.filter((l) => l.kind === 'money' && l.to === 'USA');
    expect(m.at(-1)?.secret).toBe(true);
  });
});

describe('기본 설정 (밸런스 조정 값)', () => {
  it('기본은 주사위 2개, 시작 자금 350만원', () => {
    const s = createGame(ALL, {}, 5);
    expect(s.settings.diceCount).toBe(2);
    expect(money(s, 'UK')).toBe(350);
    const r = reduce(s, { type: 'ROLL_DICE' });
    expect(r.lastRoll).toHaveLength(2);
    expect(getPlayer(r, 'UK').position).toBe(r.lastRoll[0] + r.lastRoll[1]);
  });
});
