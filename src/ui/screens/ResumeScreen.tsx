import { NATIONS } from '../../data/gameData';
import { askConfirm } from '../confirm';
import { currentPlayer } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import Flag from '../components/Flag';

export default function ResumeScreen({ game, onResume }: { game: GameState; onResume: () => void }) {
  const quit = useGame((s) => s.quitToMenu);
  const cur = currentPlayer(game);
  return (
    <main className="setup title-bg">
      <div className="setup-card">
        <h1>제국주의 마블</h1>
        <p className="lead">저장된 게임이 있습니다 — {game.turn}번째 차례, {NATIONS[cur.id].name}의 차례</p>
        <div className="nation-pick">
          {game.players.map((p) => (
            <div key={p.id} className={`nation-btn on ${p.bankrupt ? 'dim' : ''}`} style={{ '--owner': NATIONS[p.id].color } as React.CSSProperties}>
              <Flag id={p.id} size={40} />
              <span>{NATIONS[p.id].name}</span>
              <small>{p.bankrupt ? '파산' : `${p.money.toLocaleString('ko-KR')}만원`}</small>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn primary huge" onClick={onResume} autoFocus>▶ 이어하기</button>
          <button className="btn big" onClick={() => askConfirm('저장된 게임을 지우고 새 게임을 만들까요?', quit, '새 게임')}>새 게임</button>
        </div>
      </div>
    </main>
  );
}
