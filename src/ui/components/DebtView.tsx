import { COLONIES } from '../../data/gameData';
import { getPlayer, nationName, ownedColonies, won } from '../../engine/selectors';
import type { GameState, Pending } from '../../engine/types';
import { useGame } from '../../store/gameStore';

export default function DebtView({ game, d }: { game: GameState; d: Extract<Pending, { type: 'DEBT' }> }) {
  const dispatch = useGame((s) => s.dispatch);
  const p = getPlayer(game, d.debtor);
  const total = d.charges.reduce((x, c) => x + c.amount, 0);
  const cols = ownedColonies(game, p.id);
  const enough = p.money >= total;
  return (
    <>
      <h2 className="m-title">{nationName(p.id)} 자금 부족</h2>
      <ul className="m-list">{d.charges.map((c, i) => <li key={i}>{c.reason}: {won(c.amount)}</li>)}</ul>
      <p className="m-line">내야 할 돈 <b>{won(total)}</b> · 가진 돈 <b className={enough ? '' : 'neg'}>{won(p.money)}</b></p>
      {cols.length > 0 && !enough && (
        <>
          <p className="m-note">식민지를 국제은행에 팔아(투자액의 {Math.round(game.settings.sellRatio * 100)}%) 돈을 마련할 수 있습니다.</p>
          <div className="sell-grid">
            {cols.map((c) => (
              <button key={c} className="btn" onClick={() => dispatch({ type: 'SELL_FOR_DEBT', colonyId: c })}>
                {COLONIES[c].name} 매각 <small>+{won(Math.floor(game.colonies[c].invested * game.settings.sellRatio))}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="btn-row">
        <button className="btn primary big" disabled={!enough} onClick={() => dispatch({ type: 'PAY_DEBT' })}>{won(total)} 납부</button>
        {!enough && <button className="btn danger big" onClick={() => dispatch({ type: 'DECLARE_BANKRUPTCY' })}>파산 선언</button>}
      </div>
    </>
  );
}
