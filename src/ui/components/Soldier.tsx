import { useId } from 'react';
import { NATIONS, type PlayerNation } from '../../data/gameData';
import { flagBody } from './Flag';

/**
 * 게임 말: 단순화한 사람 모양에 각 나라 군복(1880~1900년 무렵)을 입히고, 머리는 국기 구슬.
 * - 영국: 붉은 상의(레드코트) + 남색 바지, 흰 가죽 십자 벨트
 * - 프랑스: 감청색 상의 + 붉은 바지(1914년까지의 '팡탈롱 루주')
 * - 독일: 프로이센 청색 상의, 붉은 깃·소매, 검은 바지, 은색 단추
 * - 미국: 남색 상의 + 카키 바지, 갈색 벨트 (미국-에스파냐 전쟁 무렵)
 */
interface Uniform { coat: string; trousers: string; collar: string; belt: string; buttons: string; cuff?: string; crossBelt?: string }

const UNIFORM: Record<PlayerNation, Uniform> = {
  UK: { coat: '#c1121f', trousers: '#1d2540', collar: '#1d2540', belt: '#f4f1e6', buttons: '#e8c04a', crossBelt: '#f4f1e6' },
  FRANCE: { coat: '#1f3a7a', trousers: '#c62828', collar: '#c62828', belt: '#3b2a1a', buttons: '#e8c04a' },
  GERMANY: { coat: '#1b2a4a', trousers: '#151515', collar: '#b71c1c', belt: '#111111', buttons: '#dcdcdc', cuff: '#b71c1c' },
  USA: { coat: '#22325e', trousers: '#b9a27a', collar: '#22325e', belt: '#6b4a2b', buttons: '#e8c04a' },
};
const SKIN = '#e9c29b';

export default function Soldier({ id, className = '' }: { id: PlayerNation; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const u = UNIFORM[id];
  const shade = `url(#sh-${uid})`;
  // 같은 모양을 색으로 한 번, 원통 음영으로 한 번 칠해 입체감을 준다
  const part = (d: string, fill: string) => (
    <>
      <path d={d} fill={fill} />
      <path d={d} fill={shade} />
    </>
  );
  return (
    <svg className={`piece-svg ${className}`} viewBox="0 0 60 100" role="img" aria-label={`${NATIONS[id].name} 군인 말`}>
      <defs>
        <linearGradient id={`sh-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".35" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id={`ball-${uid}`} cx=".36" cy=".3" r=".75">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" />
          <stop offset=".22" stopColor="#fff" stopOpacity=".15" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".5" />
        </radialGradient>
        <clipPath id={`head-${uid}`}><circle cx="30" cy="17" r="13.5" /></clipPath>
      </defs>

      {/* 바닥 그림자 */}
      <ellipse cx="30" cy="96" rx="19" ry="3.5" fill="#000" opacity=".32" />
      {/* 다리 + 장화 */}
      {part('M20 62 h9.5 v28 a2 2 0 0 1 -2 2 h-5.5 a2 2 0 0 1 -2 -2 z', u.trousers)}
      {part('M30.5 62 h9.5 v28 a2 2 0 0 1 -2 2 h-5.5 a2 2 0 0 1 -2 -2 z', u.trousers)}
      <path d="M19 85 h11 v8 a1.5 1.5 0 0 1 -1.5 1.5 h-10 a2.5 2.5 0 0 1 -2.5 -2.5 v-1 a6 6 0 0 1 3 -6 z" fill="#1a1410" />
      <path d="M30 85 h11 a6 6 0 0 1 3 6 v1 a2.5 2.5 0 0 1 -2.5 2.5 h-10 a1.5 1.5 0 0 1 -1.5 -1.5 z" fill="#1a1410" />
      {/* 팔 */}
      {part('M9.5 38 a5 5 0 0 1 9 -1 l1.5 23 a4.5 4.5 0 0 1 -9 .6 z', u.coat)}
      {part('M50.5 38 a5 5 0 0 0 -9 -1 l-1.5 23 a4.5 4.5 0 0 0 9 .6 z', u.coat)}
      {u.cuff && <><path d="M11.3 56 l8.5 -.6 l.3 4 l-8.5 .7 z" fill={u.cuff} /><path d="M48.7 56 l-8.5 -.6 l-.3 4 l8.5 .7 z" fill={u.cuff} /></>}
      <circle cx="15.8" cy="63" r="3.4" fill={SKIN} />
      <circle cx="44.2" cy="63" r="3.4" fill={SKIN} />
      {/* 몸통 (상의) */}
      {part('M17 35 Q30 31 43 35 L45 64 Q30 67.5 15 64 Z', u.coat)}
      {/* 십자 벨트 (영국) */}
      {u.crossBelt && <path d="M19 36 L41 60" stroke={u.crossBelt} strokeWidth="3.2" strokeLinecap="round" />}
      {/* 단추 */}
      {[41, 46, 51].map((y) => <circle key={y} cx="30" cy={y} r="1.3" fill={u.buttons} />)}
      {/* 허리 벨트 + 버클 */}
      <path d="M15.6 55 Q30 58 44.4 55 L44.7 59.5 Q30 62.5 15.3 59.5 Z" fill={u.belt} />
      <rect x="27.5" y="56.3" width="5" height="4.2" rx=".8" fill={u.buttons} />
      {/* 목·깃 */}
      <rect x="26" y="28" width="8" height="6" fill={SKIN} />
      <path d="M22.5 33.5 Q30 37.5 37.5 33.5 L36.5 37 Q30 40 23.5 37 Z" fill={u.collar} />
      {/* 어깨 견장 */}
      <ellipse cx="17.5" cy="35.5" rx="4.2" ry="1.8" fill={u.buttons} opacity=".9" />
      <ellipse cx="42.5" cy="35.5" rx="4.2" ry="1.8" fill={u.buttons} opacity=".9" />
      {/* 머리: 국기 구슬 */}
      <g clipPath={`url(#head-${uid})`}>
        <g transform="translate(.75 -2.5) scale(1.3)">{flagBody(id)}</g>
        <circle cx="30" cy="17" r="13.5" fill={`url(#ball-${uid})`} />
      </g>
      <circle cx="30" cy="17" r="13.5" fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="1.1" />
    </svg>
  );
}
