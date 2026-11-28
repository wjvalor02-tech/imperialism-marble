import keyArt from '../../assets/golden-key.jpg';
import { keyById, keyTitle } from '../../engine/selectors';

/** 황금열쇠 카드 (뒤집기 애니메이션) */
/** hidden: 뒷면만 보여 줌 (뽑은 나라가 아닌 기기) */
export default function KeyCard({ cardId, flip = true, onClick, selected, hidden }: { cardId: string; flip?: boolean; onClick?: () => void; selected?: boolean; hidden?: boolean }) {
  const k = keyById(cardId);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`keycard ${flip && !hidden ? 'flip' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="keycard-inner">
        <span className="keycard-back"><img src={keyArt} alt="황금열쇠" draggable={false} /></span>
        {!hidden && <span className="keycard-front" style={{ backgroundImage: `url(${keyArt})` }}>
          <span className="keycard-text">
            <b>{keyTitle(cardId)}</b>
            <span>{k.text}</span>
            {k.holdable && <small>보관 카드</small>}
          </span>
        </span>}
      </span>
    </Tag>
  );
}
