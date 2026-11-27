import { useEffect } from 'react';
import { NATIONS } from '../../data/gameData';
import { won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import Flag from '../components/Flag';
import { sound } from '../sound';

export default function GameOverScreen({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const rows = game.ranking ?? [];
  const max = Math.max(1, ...rows.map((r) => r.cash + r.investment));
  const winner = game.winner!;
  useEffect(() => { sound.fanfare(); }, []);

  return (
    <main className="over">
      <div className="over-card">
        <p className="over-reason">{game.endReason === 'TIME_UP' ? '⏰ 수업 시간 종료 — 총자산 순위' : '💥 다른 나라가 모두 파산했습니다'}</p>
        <h1><Flag id={winner} size={48} /> {NATIONS[winner].name} 승리!</h1>
        <p className="muted">총자산 = 현금 + 식민지 투자액 − 남은 대출 (동점이면 식민지 수)</p>

        <ol className="rank-list">
          {rows.map((r, i) => (
            <li key={r.id} className={r.bankrupt ? 'bankrupt' : ''}>
              <span className="rank-no">{i + 1}위</span>
              <span className="rank-name"><Flag id={r.id} size={24} /> {NATIONS[r.id].name}</span>
              <span className="rank-bar" aria-hidden>
                <span className="seg cash" style={{ width: `${(r.cash / max) * 100}%` }} />
                <span className="seg inv" style={{ width: `${(r.investment / max) * 100}%` }} />
                {r.loan > 0 && <span className="seg loan" style={{ width: `${(Math.min(r.loan, r.cash + r.investment) / max) * 100}%` }} />}
              </span>
              <span className="rank-total">
                {r.bankrupt ? '파산' : won(r.total)}
                {!r.bankrupt && <small>현금 {won(r.cash)} · 식민지 {won(r.investment)}{r.loan ? ` · 대출 −${won(r.loan)}` : ''} · {r.colonies}곳</small>}
              </span>
            </li>
          ))}
        </ol>
        <div className="legend">
          <span><i className="seg cash" /> 현금</span><span><i className="seg inv" /> 식민지 투자액</span><span><i className="seg loan" /> 남은 대출(빼기)</span>
        </div>

        <div className="over-next">
          <p>잠깐! 게임은 여기서 끝이 아닙니다. 우리가 거둔 무역대금은 <b>누구의 돈</b>이었을까요?</p>
          <button className="btn primary huge" onClick={() => dispatch({ type: 'GO_REFLECTION' })}>성찰 활동 시작 →</button>
        </div>
      </div>
    </main>
  );
}
