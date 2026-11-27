import { BOARD, COLONIES, SPECIAL_TILES, type Colony } from '../data/gameData';
import chinaImg from '../assets/tiles/china.jpg';
import ethiopiaImg from '../assets/tiles/ethiopia.jpg';
import fashodaImg from '../assets/tiles/fashoda.png';
import liberiaImg from '../assets/tiles/liberia.jpg';
import siamImg from '../assets/tiles/siam.jpg';

// 원본 PPT처럼 특별 칸에 넣는 그림 (빌드 시 HTML 안에 포함됨)
export const TILE_IMAGE: Partial<Record<string, { src: string; alt: string; fit: 'cover' | 'contain'; pos?: string }>> = {
  ethiopia: { src: ethiopiaImg, alt: '에티오피아 국기 모양 지도', fit: 'cover', pos: 'center 55%' },
  siam: { src: siamImg, alt: '타이(시암) 국기', fit: 'cover', pos: 'center' },
  liberia: { src: liberiaImg, alt: '라이베리아 국기', fit: 'cover', pos: 'left center' }, // 별이 있는 왼쪽이 보이게
  china: { src: chinaImg, alt: '중국이라는 파이를 나누는 열강 풍자화(1898)', fit: 'cover', pos: 'center 45%' },
  fashoda: { src: fashodaImg, alt: '파쇼다 사건 풍자화', fit: 'cover', pos: 'center 40%' },
};
export const tileImage = (i: number) => TILE_IMAGE[BOARD[i].kind];

/** 대륙별 색 띠 (칸 위쪽) */
export const REGION: Record<Colony['region'], { name: string; color: string }> = {
  africa: { name: '아프리카', color: '#c8372d' },
  asia: { name: '아시아', color: '#e8b400' },
  oceania: { name: '오세아니아', color: '#2e8b57' },
};

/** 휴대폰처럼 좁은 화면에서 쓰는 짧은 칸 이름 (중간에서 줄이 바뀌지 않게) */
const SHORT: Record<string, string> = {
  '남아프리카 연방': '남아공', '오스트레일리아': '호주', '캐롤라인제도': '캐롤라인',
  '중국의 반식민지화': '중국', '파쇼다 사건': '파쇼다', '시암(타이)': '시암', '인도차이나': '인도차이나',
};
export const tileShortTitle = (i: number) => SHORT[tileTitle(i)] ?? tileTitle(i);

export function tileTitle(i: number): string {
  const t = BOARD[i];
  if (t.kind === 'start') return '출발';
  if (t.kind === 'colony') return COLONIES[t.colonyId as string].name;
  return SPECIAL_TILES[t.kind].name;
}

/** 7×7 격자 좌표. 출발=좌하단, 시계방향 */
export function gridPos(i: number): { row: number; col: number; side: 'corner' | 'left' | 'top' | 'right' | 'bottom' } {
  if (i === 0) return { row: 7, col: 1, side: 'corner' };
  if (i <= 5) return { row: 7 - i, col: 1, side: 'left' };
  if (i === 6) return { row: 1, col: 1, side: 'corner' };
  if (i <= 11) return { row: 1, col: i - 5, side: 'top' };
  if (i === 12) return { row: 1, col: 7, side: 'corner' };
  if (i <= 17) return { row: i - 11, col: 7, side: 'right' };
  if (i === 18) return { row: 7, col: 7, side: 'corner' };
  return { row: 7, col: 25 - i, side: 'bottom' };
}
