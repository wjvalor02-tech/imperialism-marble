import { useRef } from 'react';
import type { GameState, PlayerId } from '../../engine/types';
import { STEP_MS } from '../useMoveAnimation';
import { gridPos } from '../tileInfo';
import Piece from './Piece';

interface Props {
  game: GameState;
  disp: Record<PlayerId, number>;
  activeId: PlayerId;
  walker: PlayerId | null; // 지금 걸어가는 말
}

/**
 * 게임판 위에 말을 따로 올려, 칸이 바뀔 때 다음 칸까지 걸어가듯 미끄러지게 한다.
 * 위치는 7×7 격자 좌표로 계산하고, 같은 칸에 여럿이면 옆으로 나란히 선다.
 */
export default function PieceLayer({ game, disp, activeId, walker }: Props) {
  const alive = game.players.filter((p) => !p.bankrupt);
  // 걷는 방향(왼쪽이면 좌우 반전)을 기억
  const lastX = useRef<Record<string, number>>({});
  const facing = useRef<Record<string, number>>({});

  return (
    <div className="piece-layer" aria-hidden>
      {alive.map((p) => {
        const tile = disp[p.id];
        const { row, col } = gridPos(tile);
        const mates = alive.filter((x) => disp[x.id] === tile);
        const i = mates.findIndex((x) => x.id === p.id);
        const offset = (i - (mates.length - 1) / 2) * 2.7; // cqw
        const x = col * 10 + offset / 10;
        if (lastX.current[p.id] !== undefined && x !== lastX.current[p.id]) facing.current[p.id] = x < lastX.current[p.id] ? -1 : 1;
        lastX.current[p.id] = x;
        const walking = walker === p.id;
        return (
          <div key={p.id}
            className={`piece ${p.id === activeId ? 'active' : ''} ${walking ? 'walking' : ''}`}
            style={{
              left: `calc(${((col - 0.5) / 7) * 100}% + ${offset}cqw)`,
              top: `calc(${(row / 7) * 100}% - .5cqw)`,
              zIndex: row * 10 + i + (walking ? 5 : 0),
              transitionDuration: walking ? `${STEP_MS}ms` : '0ms',
              ['--face' as string]: facing.current[p.id] ?? 1,
              ['--step' as string]: `${STEP_MS}ms`,
            }}>
            <Piece id={p.id} />
          </div>
        );
      })}
    </div>
  );
}
