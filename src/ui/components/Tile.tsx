import { BOARD, COLONIES, NATIONS, SPECIAL_TILES } from '../../data/gameData';
import { won } from '../../engine/selectors';
import type { GameState, PlayerId } from '../../engine/types';
import { gridPos, REGION, tileImage, tileTitle } from '../tileInfo';
import Flag from './Flag';

interface Props {
  index: number;
  game: GameState;
  occupied: boolean;
  onClick: () => void;
}

export default function Tile({ index, game, occupied, onClick }: Props) {
  const t = BOARD[index];
  const { row, col, side } = gridPos(index);
  const img = tileImage(index);
  let owner: PlayerId | null = null;
  let stage = -1;
  let price: string | null = null;
  let band: string | null = null;
  if (t.kind === 'colony') {
    const colony = COLONIES[t.colonyId as string];
    const c = game.colonies[t.colonyId as string];
    owner = c.owner;
    stage = c.stage;
    price = won(colony.price);
    band = REGION[colony.region].color;
  } else if (t.kind === 'fashoda') {
    owner = game.fashoda.owner;
    price = owner ? `대금 ${won(SPECIAL_TILES.fashoda.toll)}` : '황금열쇠';
  } else if (t.kind === 'ethiopia' || t.kind === 'china') price = `−${won(SPECIAL_TILES[t.kind].fee)}`;
  else if (t.kind === 'start') price = `통행료 ${won(game.settings.passStartToll)}`;
  else if (t.kind === 'liberia') price = '3턴 휴식';
  else if (t.kind === 'siam') price = '내 식민지로';

  const style = {
    gridRow: row,
    gridColumn: col,
    ...(owner ? { '--owner': NATIONS[owner].color } : {}),
    ...(band ? { '--band': band } : {}),
  } as React.CSSProperties;

  return (
    <button
      className={`tile side-${side} ${owner ? 'owned' : ''} ${img ? 'img-tile' : ''} ${t.kind === 'start' ? 'start' : ''} ${occupied ? 'occupied' : ''}`}
      style={style}
      onClick={onClick}
      aria-label={`${tileTitle(index)}${owner ? `, ${NATIONS[owner].name} 소유` : ''}`}
    >
      {band && <span className="band" aria-hidden />}
      {img && (
        <img className="tile-img" src={img.src} alt="" style={{ objectFit: img.fit, objectPosition: img.pos ?? 'center' }} draggable={false} />
      )}
      <span className="tile-text">
        <span className="tile-name">{tileTitle(index)}</span>
        {price && <span className="tile-price">{price}</span>}
        {owner && (
          <span className="tile-owner">
            <Flag id={owner} size={13} />
            {t.kind === 'colony' && (
              <span className="pips" aria-label={`식민화 ${stage}단계`}>
                {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= stage ? 'on' : ''} />)}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
