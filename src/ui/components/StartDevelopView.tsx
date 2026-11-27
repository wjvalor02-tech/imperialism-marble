import { useState } from 'react';
import { COLONIES } from '../../data/gameData';
import { currentPlayer, won } from '../../engine/selectors';
import type { GameState, Pending } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { REGION } from '../tileInfo';

/** 출발 통과: 개발할 내 식민지를 고르는 창 (기본 1곳) */
export default function StartDevelopView({ game, pd }: { game: GameState; pd: Extract<Pending, { type: 'START_DEVELOP' }> }) {
  const dispatch = useGame((s) => s.dispatch);
  const p = currentPlayer(game);
  const next = (id: string) => COLONIES[id].stages[game.colonies[id].stage + 1];
  // 처음에는 돈이 되는 만큼 앞에서부터 골라 둔다
  const lim = game.settings.startDevelopLimit ?? 0;
  const [picked, setPicked] = useState<string[]>(() => {
    let left = p.money;
    const ids = pd.colonyIds.filter((id) => (left >= next(id).cost ? ((left -= next(id).cost), true) : false));
    return lim > 0 ? ids.slice(0, lim) : ids;
  });
  const total = picked.reduce((sum, id) => sum + next(id).cost, 0);
  const ok = total <= p.money;
  // 고를 수 있는 수를 넘으면 가장 먼저 고른 것을 빼고 새로 고른 것을 넣는다 (1곳이면 바꾸기)
  const toggle = (id: string) => setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : lim > 0 && xs.length >= lim ? [...xs.slice(xs.length - lim + 1), id] : [...xs, id]));

  return (
    <>
      <h2 className="m-title">출발 통과 — 식민화 진행</h2>
      <p className="m-line">한 바퀴를 돌았습니다. {lim > 0 ? <>내 식민지 중 <b>{lim}곳</b>을 골라 1단계 식민화를 진행할 수 있습니다.</> : <>내 식민지마다 <b>1단계씩</b> 식민화를 진행할 수 있습니다.</>}</p>
      <div className="dev-list">
        {pd.colonyIds.map((id) => {
          const col = COLONIES[id];
          const c = game.colonies[id];
          const nx = next(id);
          const on = picked.includes(id);
          return (
            <label key={id} className={`dev-item ${on ? 'on' : ''}`} style={{ '--band': REGION[col.region].color } as React.CSSProperties}>
              <input type={lim === 1 ? 'radio' : 'checkbox'} name="start-dev" checked={on} onChange={() => toggle(id)} onClick={() => lim === 1 && on && toggle(id)} />
              <span className="dev-name"><b>{col.name}</b><small>{nx.name}</small><span className="dev-desc">{col.history.split(/(?<=다\.)\s/)[0]}</span></span>
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
          {lim === 1 ? (picked.length ? `${COLONIES[picked[0]].name} 개발하기` : '개발할 곳을 고르세요') : `${picked.length}곳 개발하기`} <small>{won(total)}</small>
        </button>
        <button className="btn big" onClick={() => dispatch({ type: 'DEVELOP_MANY', colonyIds: [] })}>개발하지 않음</button>
      </div>
    </>
  );
}
