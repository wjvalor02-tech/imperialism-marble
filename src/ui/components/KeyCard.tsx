import { keyById, keyTitle } from '../../engine/selectors';

/** 황금열쇠 카드 (뒤집기 애니메이션) */
/** hidden: 뒷면만 보여 줌 (뽑은 나라가 아닌 기기) */
export default function KeyCard({ cardId, flip = true, onClick, selected, hidden }: { cardId: string; flip?: boolean; onClick?: () => void; selected?: boolean; hidden?: boolean }) {
  const k = keyById(cardId);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`keycard ${flip && !hidden ? 'flip' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="keycard-inner">
        <span className="keycard-back">🔑<b>황금열쇠</b></span>
        {!hidden && <span className="keycard-front">
          <b>{keyTitle(cardId)}</b>
          <span>{k.text}</span>
          {k.holdable && <small>보관 카드</small>}
        </span>}
      </span>
    </Tag>
  );
}
