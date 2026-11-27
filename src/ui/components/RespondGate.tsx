import { useState, type ReactNode } from 'react';
import { NATIONS } from '../../data/gameData';
import type { PlayerId } from '../../engine/types';
import { josa } from '../../engine/selectors';
import { useControlCtx } from '../controlContext';
import Flag from './Flag';

/** 핫시트: 차례가 아닌 나라가 응답해야 할 때 먼저 띄우는 전환 화면 */
export default function RespondGate({ who, current, children }: { who: PlayerId; current: PlayerId; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ctl = useControlCtx();
  // 전환 화면은 한 화면 모드에서만 필요 (온라인·싱글은 각자 자기 기기)
  if (open || !ctl?.hotseat) return <>{children}</>;
  return (
    <div className="gate" style={{ '--owner': NATIONS[who].color } as React.CSSProperties}>
      <Flag id={who} size={64} />
      <h2>{NATIONS[who].name} 모둠, 응답해 주세요!</h2>
      <p>지금은 {NATIONS[current].name}의 차례이지만, {NATIONS[who].name}의 결정이 필요합니다.</p>
      <button className="btn primary big" onClick={() => setOpen(true)} autoFocus>{josa(`${NATIONS[who].name}이(가) 확인합니다`)}</button>
    </div>
  );
}
