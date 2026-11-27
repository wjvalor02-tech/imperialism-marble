import { create } from 'zustand';
import type { PlayerId, Settings } from '../engine/types';
import type { Names, Seats } from './protocol';
import type { LinkStatus, TransportKind } from './transport';

/** 연결 상태 (저장하지 않음) */
interface NetStore {
  role: 'none' | 'host' | 'client';
  room: string | null;
  status: LinkStatus | 'idle';
  kind: TransportKind | null;
  // 대기실 (방장은 직접 관리, 참여 기기는 방장에게서 받음)
  seats: Seats;
  names: Names;
  aiFill: boolean;
  // 방장: 게임 시작 전 설정
  hostSetup: { settings: Partial<Settings>; pin: string } | null;
  // 참여 기기
  clientId: string | null;
  myNation: PlayerId | null;
  notice: string | null;
  set: (p: Partial<NetStore>) => void;
}

export const useNet = create<NetStore>()((set) => ({
  role: 'none',
  room: null,
  status: 'idle',
  kind: null,
  seats: {},
  names: {},
  aiFill: true,
  hostSetup: null,
  clientId: null,
  myNation: null,
  notice: null,
  set: (p) => set(p),
}));
