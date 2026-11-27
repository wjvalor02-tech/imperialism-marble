import { BOARD } from '../../data/gameData';
import { currentPlayer } from '../../engine/selectors';
import type { GameState, PlayerId } from '../../engine/types';
import CenterPanel from './CenterPanel';
import PieceLayer from './PieceLayer';
import Tile from './Tile';

interface Props {
  game: GameState;
  disp: Record<PlayerId, number>;
  rolling: boolean;
  busy: boolean;
  walker: PlayerId | null;
  onTile: (i: number) => void;
}

export default function Board({ game, disp, rolling, busy, walker, onTile }: Props) {
  const active = currentPlayer(game).id;
  return (
    <div className="board-wrap">
      <div className="board">
        {BOARD.map((_, i) => (
          <Tile
            key={i}
            index={i}
            game={game}
            occupied={game.players.some((p) => !p.bankrupt && disp[p.id] === i)}
            onClick={() => onTile(i)}
          />
        ))}
        <CenterPanel game={game} rolling={rolling} busy={busy} />
        <PieceLayer game={game} disp={disp} activeId={active} walker={walker} />
      </div>
    </div>
  );
}
