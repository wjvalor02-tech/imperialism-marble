import type { PlayerNation } from '../../data/gameData';
import { NATIONS } from '../../data/gameData';

// 윈도우는 국기 이모지를 표시하지 못하므로 SVG로 그린다.
// 독일은 당시(1871~1918) 독일 제국기(검정·하양·빨강)를 사용.
export default function Flag({ id, size = 28, round = false }: { id: PlayerNation; size?: number; round?: boolean }) {
  const w = round ? size : size * 1.5;
  const h = size;
  return (
    <svg width={w} height={h} viewBox={round ? '0 0 30 30' : '0 0 45 30'} role="img" aria-label={`${NATIONS[id].name} 국기`}
      style={{ borderRadius: round ? '50%' : 3, flexShrink: 0, boxShadow: '0 0 0 1.5px rgba(0,0,0,.35)' }}>
      {round ? <g transform="translate(-7.5 0)">{flagBody(id)}</g> : flagBody(id)}
    </svg>
  );
}

/** 국기 그림 (45×30 좌표). 말 머리 등 다른 SVG 안에서도 쓴다 */
export function flagBody(id: PlayerNation) {
  switch (id) {
    case 'UK':
      return (
        <g>
          <rect width="45" height="30" fill="#012169" />
          <path d="M0 0L45 30M45 0L0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0L45 30M45 0L0 30" stroke="#C8102E" strokeWidth="2" />
          <path d="M22.5 0V30M0 15H45" stroke="#fff" strokeWidth="10" />
          <path d="M22.5 0V30M0 15H45" stroke="#C8102E" strokeWidth="6" />
        </g>
      );
    case 'FRANCE':
      return (
        <g>
          <rect width="15" height="30" fill="#0055A4" />
          <rect x="15" width="15" height="30" fill="#fff" />
          <rect x="30" width="15" height="30" fill="#EF4135" />
        </g>
      );
    case 'GERMANY':
      return (
        <g>
          <rect width="45" height="10" fill="#111" />
          <rect y="10" width="45" height="10" fill="#fff" />
          <rect y="20" width="45" height="10" fill="#DD0000" />
        </g>
      );
    case 'USA':
      return (
        <g>
          <rect width="45" height="30" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={(i * 30) / 13} width="45" height={30 / 13} fill="#B22234" />)}
          <rect width="20" height={(30 / 13) * 7} fill="#3C3B6E" />
          {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={3 + c * 4.6} cy={3.5 + r * 5} r="1.1" fill="#fff" />))}
        </g>
      );
  }
}
