import { useEffect, useState } from 'react';
import { won } from '../../engine/selectors';
import type { Pending } from '../../engine/types';

type Notice = Extract<Pending, { type: 'NOTICE' }>;

export default function NoticeView({ n, onOk, image }: { n: Notice; onOk: () => void; image?: { src: string; alt: string } }) {
  const [left, setLeft] = useState(Math.ceil((n.minMs ?? 0) / 1000));
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const total = n.charges?.reduce((x, c) => x + c.amount, 0) ?? 0;
  return (
    <>
      {image && <img className="m-img" src={image.src} alt={image.alt} />}
      <h2 className="m-title">{n.title}</h2>
      {n.lines.map((l, i) => <p key={i} className="m-line">{l}</p>)}
      {n.note && <p className={`m-note ${n.tone === 'reflect' ? 'reflect' : ''}`}>{n.note}</p>}
      <div className="btn-row">
        <button className="btn primary big" disabled={left > 0} onClick={onOk} autoFocus>
          {left > 0 ? `읽는 중… ${left}` : total ? `${won(total)} 납부하고 확인` : n.then === 'SIAM_JUMP' ? '이동하기' : '확인'}
        </button>
      </div>
    </>
  );
}
