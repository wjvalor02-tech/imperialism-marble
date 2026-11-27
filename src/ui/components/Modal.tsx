import type { ReactNode } from 'react';
import { useControlCtx } from '../controlContext';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  tone?: string;
  wide?: boolean;
  label: string;
  decision?: boolean; // 게임 결정 창: 이 기기가 결정할 수 없으면 읽기 전용
}

export default function Modal({ children, onClose, tone = 'info', wide, label, decision }: Props) {
  const ctl = useControlCtx();
  const locked = decision && ctl && !ctl.canControl;
  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className={`modal tone-${tone} ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}
        onClick={(e) => e.stopPropagation()}>
        {onClose && <button className="modal-x" onClick={onClose} aria-label="닫기">✕</button>}
        {locked && <p className="waiting-banner" role="status">{ctl.waiting}</p>}
        {locked ? <fieldset className="locked" disabled>{children}</fieldset> : children}
      </div>
    </div>
  );
}
