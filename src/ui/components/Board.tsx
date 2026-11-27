import { BOARD } from '../../data/gameData';
import { currentPlayer } from '../../engine/selectors';
import type { GameState, PlayerId } from '../../engine/types';
import CenterPanel from './CenterPanel';
import Tile from './Tile';

interface Props {
  game: GameState;
  disp: Record<PlayerId, number>;
  rolling: boolean;
  busy: boolean;
  onTile: (i: number) => void;
}

export default function Board({ game, disp, rolling, busy, onTile }: Props) {
  const active = currentPlayer(game).id;
  return (
    <div className="board-wrap">
      <div className="board">
        {BOARD.map((_, i) => (
          <Tile
            key={i}
            index={i}
            game={game}
            activeId={active}
            tokens={game.players.filter((p) => !p.bankrupt && disp[p.id] === i).map((p) => p.id)}
            onClick={() => onTile(i)}
          />
        ))}
        <CenterPanel game={game} rolling={rolling} busy={busy} />
      </div>
    </div>
  );
}
