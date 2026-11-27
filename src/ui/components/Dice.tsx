import { useEffect, useRef, useState } from 'react';
import { ROLL_MS } from '../useMoveAnimation';

/** 3D 주사위: CSS 정육면체. 굴리면 여러 바퀴 돌다가 나온 눈이 앞면에 오도록 멈춘다. */

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

// 각 눈이 앞(시청자 쪽)을 보게 하는 정육면체 회전 [rotateX, rotateY]
// 면 배치: 1 앞, 6 뒤, 3 오른쪽, 4 왼쪽, 2 위, 5 아래 (마주 보는 면의 합 = 7)
const FACE_ROT: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };

interface Props {
  value: number | undefined;
  rolling: boolean;
  index?: number; // 여러 개일 때 도는 모양을 다르게
}

export default function Dice({ value = 1, rolling, index = 0 }: Props) {
  const turns = useRef(0);
  const target = (v: number): [number, number] => {
    const [fx, fy] = FACE_ROT[v] ?? FACE_ROT[1];
    return [fx + 360 * turns.current, fy + 360 * (turns.current + index)];
  };
  const [rot, setRot] = useState<[number, number]>(() => target(value));
  const [spinning, setSpinning] = useState(false);

  // 굴리기 시작: 2~3바퀴 더 돌면서 나온 눈으로 착지
  useEffect(() => {
    if (!rolling) return;
    turns.current += 2 + (index % 2);
    setSpinning(true);
    setRot(target(value));
    const t = window.setTimeout(() => setSpinning(false), ROLL_MS + 50);
    return () => clearTimeout(t);
  }, [rolling]); // eslint-disable-line react-hooks/exhaustive-deps

  // 굴림 없이 값만 바뀐 경우 (되돌리기·불러오기): 바로 맞춘다
  useEffect(() => {
    if (!rolling && !spinning) setRot(target(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`die3d-wrap ${spinning ? 'bouncing' : ''}`} role="img" aria-label={`주사위 ${value}`} style={{ animationDelay: `${index * 60}ms` }}>
      <div className="die3d-tilt">
        <div className="die3d" style={{
          transform: `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)`,
          transition: spinning ? `transform ${ROLL_MS}ms cubic-bezier(.15,.65,.2,1)` : 'none',
        }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={`die-face f${n}`}>
              <svg viewBox="0 0 100 100" aria-hidden>
                {PIPS[n].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={n === 1 ? 12 : 9} className={n === 1 ? 'pip red' : 'pip'} />)}
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
