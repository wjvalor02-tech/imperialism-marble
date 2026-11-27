import { useConfirm } from '../confirm';

export default function ConfirmDialog() {
  const { msg, yes, onYes, close } = useConfirm();
  if (!msg) return null;
  return (
    <div className="overlay confirm-overlay" onClick={close} role="presentation">
      <div className="modal confirm" role="alertdialog" aria-modal="true" aria-label={msg} onClick={(e) => e.stopPropagation()}>
        <p className="m-line big-line">{msg}</p>
        <div className="btn-row">
          <button className="btn primary big" autoFocus onClick={() => { const f = onYes; close(); f?.(); }}>{yes}</button>
          <button className="btn big" onClick={close}>취소</button>
        </div>
      </div>
    </div>
  );
}
