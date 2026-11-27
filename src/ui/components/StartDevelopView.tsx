import { useState } from 'react';
import { COLONIES } from '../../data/gameData';
import { currentPlayer, won } from '../../engine/selectors';
import type { GameState, Pending } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { REGION } from '../tileInfo';

/** 출발 통과: 내 식민지마다 1단계씩 개발할지 고르는 창 */
export default function StartDevelopView({ game, pd }: { game: GameState; pd: Extract<Pending, { type: 'START_DEVELOP' }> }) {
  const dispatch = useGame((s) => s.dispatch);
  const p = currentPlayer(game);
  const next = (id: string) => COLONIES[id].stages[game.colonies[id].stage + 1];
  // 처음에는 돈이 되는 만큼 앞에서부터 골라 둔다
  const [picked, setPicked] = useState<string[]>(() => {
    let left = p.money;
    return pd.colonyIds.filter((id) => (left >= next(id).cost ? ((left -= next(id).cost), true) : false));
  });
  const total = picked.reduce((sum, id) => sum + next(id).cost, 0);
  const ok = total <= p.money;
  const toggle = (id: string) => setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return (
    <>
      <h2 className="m-title">출발 통과 — 식민화 진행</h2>
      <p className="m-line">한 바퀴를 돌았습니다. 내 식민지마다 <b>1단계씩</b> 식민화를 진행할 수 있습니다.</p>
      <div className="dev-list">
        {pd.colonyIds.map((id) => {
          const col = COLONIES[id];
          const c = game.colonies[id];
          const nx = next(id);
          const on = picked.includes(id);
          return (
            <label key={id} className={`dev-item ${on ? 'on' : ''}`} style={{ '--band': REGION[col.region].color } as React.CSSProperties}>
              <input type="checkbox" checked={on} onChange={() => toggle(id)} />
              <span className="dev-name"><b>{col.name}</b><small>{nx.name}</small></span>
              <span className="dev-cost">{won(nx.cost)}</span>
              <span className="dev-toll">대금 {won(col.stages[c.stage].toll)} → <b>{won(nx.toll)}</b></span>
            </label>
          );
        })}
      </div>
      <p className="m-line dev-sum">
        합계 <b>{won(total)}</b> · 보유 <b className={ok ? '' : 'neg'}>{won(p.money)}</b>
      </p>
      <div className="btn-row">
        <button className="btn primary big" disabled={!ok || !picked.length}
          onClick={() => dispatch({ type: 'DEVELOP_MANY', colonyIds: picked })} autoFocus>
          {picked.length}곳 개발하기 <small>{won(total)}</small>
        </button>
        <button className="btn big" onClick={() => dispatch({ type: 'DEVELOP_MANY', colonyIds: [] })}>개발하지 않음</button>
      </div>
    </>
  );
}
