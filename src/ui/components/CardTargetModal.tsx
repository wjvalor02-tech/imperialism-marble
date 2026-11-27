import { COLONIES, NATIONS } from '../../data/gameData';
import { canApply } from '../../engine/reducer';
import { currentPlayer, isAllied, keyById, keyTitle, won } from '../../engine/selectors';
import type { Action, GameState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import Flag from './Flag';
import Modal from './Modal';

export default function CardTargetModal({ game, cardId, onClose }: { game: GameState; cardId: string; onClose: () => void }) {
  const dispatch = useGame((s) => s.dispatch);
  const k = keyById(cardId);
  const p = currentPlayer(game);
  const use = (a: Action) => { if (dispatch(a)) onClose(); };

  let options: { key: string; label: React.ReactNode; action: Action }[] = [];
  if (k.effect === 'WAR' || k.effect === 'SABOTAGE' || k.effect === 'SELL_COLONY') {
    const mine = k.effect === 'SELL_COLONY';
    options = Object.entries(game.colonies)
      .filter(([, c]) => c.owner && (mine ? c.owner === p.id : c.owner !== p.id))
      .map(([id, c]) => {
        const st = COLONIES[id].stages[c.stage];
        return {
          key: id,
          action: { type: 'USE_KEY', cardId, targetColonyId: id } as Action,
          label: (
            <>
              <Flag id={c.owner!} size={16} /> <b>{COLONIES[id].name}</b>
              <small>{st.name} · 대금 {won(st.toll)}{mine ? ` · 매각가 ${won(Math.floor(c.invested * game.settings.sellRatio))}` : ''}</small>
            </>
          ),
        };
      });
  } else if (k.effect === 'ALLIANCE') {
    options = game.players
      .filter((x) => x.id !== p.id && !x.bankrupt && !isAllied(game, p.id, x.id))
      .map((x) => ({ key: x.id, action: { type: 'USE_KEY', cardId, targetPlayer: x.id } as Action,
        label: <><Flag id={x.id} size={16} /> <b>{NATIONS[x.id].name}</b><small>에 동맹 제안</small></> }));
  }

  return (
    <Modal label="황금열쇠 사용" tone="gold" wide onClose={onClose}>
      <h2 className="m-title">황금열쇠 · {keyTitle(cardId)}</h2>
      <p className="m-line">{k.text}</p>
      {k.cost && <p className="m-note">비용 {won(k.cost)} · 보유 {won(p.money)}</p>}
      <div className="target-grid">
        {options.map((o) => (
          <button key={o.key} className="btn target" disabled={!canApply(game, o.action)} onClick={() => use(o.action)}>{o.label}</button>
        ))}
        {!options.length && <p className="muted">사용할 수 있는 대상이 없습니다.</p>}
      </div>
      <div className="btn-row"><button className="btn" onClick={onClose}>취소</button></div>
    </Modal>
  );
}
