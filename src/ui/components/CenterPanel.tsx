import { NATIONS } from '../../data/gameData';
import rhodesImg from '../../assets/tiles/rhodes.jpg';
import { currentPlayer, won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { useControlCtx } from '../controlContext';
import { REGION } from '../tileInfo';
import Dice from './Dice';
import Piece from './Piece';

/**
 * 게임판 가운데: 제목·색 안내 / 로즈 거상(원본 PPT처럼 크게) / 최근 사건 한 줄.
 * 차례가 오면 주사위 창이 로즈 거상 위에 팝업으로 뜬다.
 */
export default function CenterPanel({ game, rolling, busy }: { game: GameState; rolling: boolean; busy: boolean }) {
  const dispatch = useGame((s) => s.dispatch);
  const p = currentPlayer(game);
  const n = NATIONS[p.id];
  const ctl = useControlCtx();
  const mine = ctl?.canControl ?? true;
  const idle = !game.pending && !busy && mine;
  // 주사위가 구르고 말이 움직이는 동안(busy)에는 계속 보여 주고, 결정 창이 뜨면 숨김
  const showTurn = !game.pending || busy;
  const last = [...game.log].reverse().find((l) => l.kind !== 'turn');

  return (
    <div className="center">
      <div className="center-title">
        <h1>제국주의 마블</h1>
        <p>열강의 식민지 분할 (19세기 말~20세기 초)</p>
        <div className="region-legend">
          {Object.values(REGION).map((r) => <span key={r.name}><i style={{ background: r.color }} />{r.name}</span>)}
        </div>
      </div>

      <figure className={`center-stage ${showTurn ? 'has-pop' : ''}`}>
        <img className="rhodes-img" src={rhodesImg} alt="케이프타운에서 카이로까지 아프리카를 가로질러 선 세실 로즈 풍자화" draggable={false} />
        <figcaption>로즈 거상 — 영국 잡지 「펀치」, 1892</figcaption>

        {showTurn && (
          <div key={game.turn} className="turn-pop" style={{ '--owner': n.color } as React.CSSProperties} role="region" aria-label={`${n.name}의 차례`}>
            <div className="turn-who">
              <span className="turn-pawn"><Piece id={p.id} /></span>
              <div>
                <small>{game.turn}번째 차례</small>
                <strong>{n.name}</strong>
              </div>
            </div>
            <div className="dice-row">
              {game.lastRoll.length ? game.lastRoll.map((v, i) => <Dice key={i} index={i} value={v} rolling={rolling} />) : Array.from({ length: game.settings.diceCount ?? 1 }, (_, i) => <Dice key={i} index={i} value={i + 1} rolling={rolling} />)}
            </div>
            {idle && p.skipTurns > 0 ? (
              <div className="liberia-box">
                <p>라이베리아에 묶여 있습니다 (남은 {p.skipTurns}턴)</p>
                <div className="btn-row">
                  <button className="btn" onClick={() => dispatch({ type: 'LIBERIA_WAIT' })}>이번 턴 쉬기</button>
                  <button className="btn primary" onClick={() => dispatch({ type: 'LIBERIA_PENALTY_DONE' })}>
                    엉덩이로 이름쓰기 완료<small>진행자 확인</small>
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn primary roll" disabled={!idle} onClick={() => dispatch({ type: 'ROLL_DICE' })}>
                {busy ? (rolling ? '굴리는 중…' : '이동 중…') : mine ? '주사위 굴리기' : ctl?.waiting}
              </button>
            )}
            {idle && p.heldCards.length > 0 && p.skipTurns === 0 && <p className="hint">보관한 황금열쇠는 나라 현황 카드에서 주사위 전에 쓸 수 있어요.</p>}
          </div>
        )}
      </figure>

      <p className="ticker" aria-live="polite">
        <b>최근</b> {last ? last.text : '주사위를 굴려 게임을 시작하세요.'}
        {game.chinaPool > 0 && <span className="muted"> · 중국 공동 식민통치기구 적립금 {won(game.chinaPool)}</span>}
      </p>
    </div>
  );
}
