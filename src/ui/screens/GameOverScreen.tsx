import { useEffect } from 'react';
import { NATIONS, RULES } from '../../data/gameData';
import { won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import Flag from '../components/Flag';
import { sound } from '../sound';

export default function GameOverScreen({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const rows = game.ranking ?? [];
  const v = RULES.victoryScore;
  const max = Math.max(1, ...rows.map((r) => r.score));
  const winner = game.winner!;
  useEffect(() => { sound.fanfare(); }, []);

  return (
    <main className="over">
      <div className="over-card">
        <p className="over-reason">{game.endReason === 'TIME_UP' ? '⏰ 수업 시간 종료 — 식민지 점수 순위' : '💥 다른 나라가 모두 파산했습니다'}</p>
        <h1><Flag id={winner} size={48} /> {NATIONS[winner].name} 승리!</h1>
        <p className="muted">점수 = 식민지 1곳당 {v.perColony}점 + 식민화 단계마다 {v.perStage}점 + 파쇼다 {v.fashoda}점 · 동점이면 현금 − 대출이 많은 나라</p>

        <ol className="rank-list">
          {rows.map((r, i) => (
            <li key={r.id} className={r.bankrupt ? 'bankrupt' : ''}>
              <span className="rank-no">{i + 1}위</span>
              <span className="rank-name"><Flag id={r.id} size={24} /> {NATIONS[r.id].name}</span>
              <span className="rank-bar" aria-hidden>
                <span className="seg cash" style={{ width: `${((r.colonies * v.perColony) / max) * 100}%` }} />
                <span className="seg inv" style={{ width: `${((r.stages * v.perStage) / max) * 100}%` }} />
                {r.fashoda && <span className="seg fa" style={{ width: `${(v.fashoda / max) * 100}%` }} />}
              </span>
              <span className="rank-total">
                {r.bankrupt ? '파산' : `${r.score}점`}
                {!r.bankrupt && <small>식민지 {r.colonies}곳 · 단계 합 {r.stages}{r.fashoda ? ' · 파쇼다' : ''} · 현금 {won(r.cash)}{r.loan ? ` · 대출 −${won(r.loan)}` : ''}</small>}
              </span>
            </li>
          ))}
        </ol>
        <div className="legend">
          <span><i className="seg cash" /> 식민지 수</span><span><i className="seg inv" /> 식민화 단계</span><span><i className="seg fa" /> 파쇼다</span>
        </div>

        <div className="over-next">
          <p>잠깐! 게임은 여기서 끝이 아닙니다. 우리가 거둔 무역대금은 <b>누구의 돈</b>이었을까요?</p>
          <button className="btn primary huge" onClick={() => dispatch({ type: 'GO_REFLECTION' })}>성찰 활동 시작 →</button>
        </div>
      </div>
    </main>
  );
}
