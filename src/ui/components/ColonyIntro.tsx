import { useEffect, useState } from 'react';
import { COLONIES } from '../../data/gameData';
import { won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { REGION } from '../tileInfo';
import Flag from './Flag';

const READ_SEC = 2; // 설명을 읽을 최소 시간

/** 확보·개발을 정하기 전에 먼저 보여 주는 식민지 설명 카드 */
export default function ColonyIntro({ game, colonyId, kind, onNext }: { game: GameState; colonyId: string; kind: 'buy' | 'develop'; onNext: () => void }) {
  const col = COLONIES[colonyId];
  const c = game.colonies[colonyId];
  const region = REGION[col.region];
  const [left, setLeft] = useState(READ_SEC);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="colony-intro" style={{ '--band': region.color } as React.CSSProperties}>
      <div className="intro-band">{region.name} · {kind === 'buy' ? `확보 가격 ${won(col.price)}` : `현재 단계: ${c.stage === 0 ? '확보만 한 상태' : col.stages[c.stage].name}`}</div>
      <h2 className="m-title">{col.name}</h2>
      {c.owner && <p className="m-owner"><Flag id={c.owner} size={18} /> 지금 이 땅을 지배하는 나라</p>}
      <p className="m-line">{col.history}</p>
      <p className="m-note">실제 역사에서의 지배국: <b>{col.historicalRuler}</b></p>
      <div className="btn-row">
        <button className="btn primary big" disabled={left > 0} onClick={onNext} autoFocus>
          {left > 0 ? `읽는 중… ${left}` : kind === 'buy' ? '확보할지 정하기' : '개발할지 정하기'}
        </button>
      </div>
    </div>
  );
}
