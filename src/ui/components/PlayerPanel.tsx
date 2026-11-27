import { NATIONS } from '../../data/gameData';
import { allianceOf, assetRow, currentPlayer, keyById, keyTitle, nationName, ownedColonies, won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useCardVisibility } from '../useCardVisibility';
import Flag from './Flag';

const ACTIVE_USE = new Set(['WAR', 'SABOTAGE', 'SELL_COLONY', 'ALLIANCE']);

interface Props {
  game: GameState;
  canAct: boolean;
  onUseCard: (cardId: string) => void;
}

export default function PlayerPanel({ game, canAct, onUseCard }: Props) {
  const cur = currentPlayer(game);
  const canSee = useCardVisibility(game);
  return (
    <aside className="players" aria-label="제국 현황">
      {game.players.map((p) => {
        const n = NATIONS[p.id];
        const row = assetRow(game, p);
        const isCur = p.id === cur.id;
        const al = allianceOf(game, p.id);
        return (
          <section key={p.id} className={`pcard ${isCur ? 'current' : ''} ${p.bankrupt ? 'bankrupt' : ''}`} style={{ '--owner': n.color } as React.CSSProperties}>
            <header>
              <Flag id={p.id} size={26} />
              <h3>{n.name}</h3>
              {isCur && !p.bankrupt && <span className="badge now">차례</span>}
              {p.bankrupt && <span className="badge dead">파산</span>}
            </header>
            {!p.bankrupt && (
              <>
                <div className="pmoney">{won(p.money)}</div>
                <dl className="pstats">
                  <div><dt>식민지</dt><dd>{ownedColonies(game, p.id).length}곳{game.fashoda.owner === p.id ? ' + 파쇼다' : ''}</dd></div>
                  <div><dt>총자산</dt><dd>{won(row.total)}</dd></div>
                  <div><dt>바퀴</dt><dd>{p.lap}</dd></div>
                  {p.loan > 0 && <div><dt>남은 대출</dt><dd className="neg">{won(p.loan)}</dd></div>}
                </dl>
                <div className="pbadges">
                  {p.skipTurns > 0 && <span className="badge warn">⛓ 라이베리아 {p.skipTurns}턴</span>}
                  {al && <span className="badge ally">🤝 {nationName(al.a === p.id ? al.b : al.a)}과 동맹</span>}
                </div>
                {p.heldCards.length > 0 && !canSee(p.id) && (
                  <div className="pkeys"><span className="keychip hidden-keys" title="카드 내용은 그 나라만 볼 수 있습니다">🔑 황금열쇠 {p.heldCards.length}장</span></div>
                )}
                {p.heldCards.length > 0 && canSee(p.id) && (
                  <div className="pkeys">
                    {p.heldCards.map((id) => {
                      const k = keyById(id);
                      const usable = isCur && canAct && ACTIVE_USE.has(k.effect);
                      return (
                        <button key={id} className={`keychip ${usable ? 'usable' : ''}`} disabled={!usable}
                          title={k.text} onClick={() => onUseCard(id)}>
                          🔑 {keyTitle(id)}
                          {!ACTIVE_USE.has(k.effect) && <small>상황 시 자동</small>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        );
      })}
    </aside>
  );
}
