import { describe, expect, it } from 'vitest';
import { chooseAiAction } from '../ai';
import { reduce } from '../reducer';
import { actorOf } from '../selectors';
import { createGame } from '../setup';

describe('AI 플레이어', () => {
  it('AI끼리 200차례를 두어도 항상 유효한 액션만 고른다 (막힘 없음)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let r = seed;
      const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      let s = createGame(['UK', 'FRANCE', 'GERMANY', 'USA'], { quizEnabled: seed % 2 === 0 }, seed);
      for (let i = 0; i < 5000 && s.phase === 'PLAYING' && s.turn <= 200; i++) {
        const a = chooseAiAction(s, actorOf(s), rand);
        const n = reduce(s, a);
        expect(n, `seed ${seed}: ${a.type} @ ${s.pending?.type}`).not.toBe(s);
        s = n;
      }
    }
  }, 60000);

  it('결정해야 할 나라: 방어는 방어국, 동맹은 제안받은 나라', () => {
    const s = createGame(['UK', 'FRANCE'], {}, 1);
    s.pending = { type: 'DEFENSE_PROMPT', attacker: 'UK', defender: 'FRANCE', colonyId: 'egypt' };
    expect(actorOf(s)).toBe('FRANCE');
    s.pending = { type: 'ALLIANCE_PROMPT', from: 'UK', to: 'FRANCE' };
    expect(actorOf(s)).toBe('FRANCE');
    s.pending = null;
    expect(actorOf(s)).toBe('UK');
  });
});
