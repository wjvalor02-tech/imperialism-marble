import { NATIONS, type PlayerNation } from '../../data/gameData';
import fr from '../../assets/pieces/FRANCE.webp';
import de from '../../assets/pieces/GERMANY.webp';
import uk from '../../assets/pieces/UK.webp';
import us from '../../assets/pieces/USA.webp';

/** 나라별 말 그림 (사용자 제공 일러스트에서 잘라 배경을 투명하게 만든 것) */
export const PIECE_IMG: Record<PlayerNation, string> = { UK: uk, FRANCE: fr, GERMANY: de, USA: us };

export default function Piece({ id, className = '' }: { id: PlayerNation; className?: string }) {
  return <img className={`piece-img ${className}`} src={PIECE_IMG[id]} alt={`${NATIONS[id].name} 말`} draggable={false} />;
}
