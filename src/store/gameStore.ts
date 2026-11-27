import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { reduce } from '../engine/reducer';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId, Settings } from '../engine/types';

const UNDO_LIMIT = 10;

/** 게임 방식: 한 화면(핫시트) / 싱글(나머지 AI) / 온라인 모둠(이 기기가 방장) */
export type GameMode = 'hotseat' | 'single' | 'online';

export interface Session {
  mode: GameMode;
  ai: PlayerId[]; // AI가 두는 나라
  me?: PlayerId; // 싱글모드에서 사람이 고른 나라
  room?: string; // 온라인 방 코드
  seats?: Partial<Record<PlayerId, string>>; // 온라인: 나라 → 학생 기기 id
  names?: Partial<Record<PlayerId, string>>; // 온라인: 모둠 이름
  hostTakeover?: boolean; // 온라인: 전자칠판에서 대신 조작
}

interface Store {
  game: GameState | null;
  past: GameState[];
  session: Session;
  elapsedSec: number;
  timerRunning: boolean;
  muted: boolean;
  musicOn: boolean;
  hostPin: string;
  reflections: Record<string, string>;
  newGame: (nations: PlayerId[], settings: Partial<Settings>, pin: string, session?: Session) => void;
  dispatch: (a: Action) => boolean;
  undo: () => void;
  quitToMenu: () => void;
  tick: () => void;
  setTimerRunning: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  setMusicOn: (v: boolean) => void;
  setReflection: (k: string, v: string) => void;
  setSession: (patch: Partial<Session>) => void;
}

// 온라인 참여 기기(학생)는 액션을 직접 처리하지 않고 방장에게 보낸다
let remoteSink: ((a: Action) => void) | null = null;
export const setRemoteSink = (fn: ((a: Action) => void) | null) => { remoteSink = fn; };

// 참여 기기(학생 탭)는 이 기기의 저장 게임을 덮어쓰지 않도록 저장하지 않는다
export const isClientTab = () => {
  try { return sessionStorage.getItem('imperial-role') === 'client'; } catch { return false; }
};
const guardedStorage: StateStorage = {
  getItem: (k) => (isClientTab() ? null : localStorage.getItem(k)),
  setItem: (k, v) => { if (!isClientTab()) localStorage.setItem(k, v); },
  removeItem: (k) => { if (!isClientTab()) localStorage.removeItem(k); },
};

const DEFAULT_SESSION: Session = { mode: 'hotseat', ai: [] };

export const useGame = create<Store>()(
  persist(
    (set, get) => ({
      game: null,
      past: [],
      session: DEFAULT_SESSION,
      elapsedSec: 0,
      timerRunning: true,
      muted: false,
      musicOn: true,
      hostPin: '0000',
      reflections: {},
      newGame: (nations, settings, pin, session = DEFAULT_SESSION) =>
        set({ game: createGame(nations, settings), past: [], session, elapsedSec: 0, timerRunning: true, hostPin: pin || '0000', reflections: {} }),
      dispatch: (a) => {
        if (remoteSink) { remoteSink(a); return true; }
        const { game, past } = get();
        if (!game) return false;
        const next = reduce(game, a);
        if (next === game) return false;
        set({ game: next, past: [...past, game].slice(-UNDO_LIMIT) });
        return true;
      },
      undo: () => {
        const { past } = get();
        if (!past.length) return;
        set({ game: past[past.length - 1], past: past.slice(0, -1) });
      },
      quitToMenu: () => set({ game: null, past: [], session: DEFAULT_SESSION }),
      tick: () => {
        const { game, elapsedSec, timerRunning, dispatch } = get();
        if (!game || game.phase !== 'PLAYING' || !timerRunning || remoteSink) return;
        const limit = game.settings.timeLimitMinutes * 60;
        const next = elapsedSec + 1;
        set({ elapsedSec: next });
        if (limit > 0 && next >= limit && !game.timeUp) dispatch({ type: 'TIME_UP' });
      },
      setTimerRunning: (v) => set({ timerRunning: v }),
      setMuted: (v) => set({ muted: v }),
      setMusicOn: (v) => set({ musicOn: v }),
      setReflection: (k, v) => set((st) => ({ reflections: { ...st.reflections, [k]: v } })),
      setSession: (patch) => set((st) => ({ session: { ...st.session, ...patch } })),
    }),
    {
      name: 'imperial-marble-save-v1',
      storage: createJSONStorage(() => guardedStorage),
      partialize: (st) => ({
        game: st.game, past: st.past, session: st.session, elapsedSec: st.elapsedSec, timerRunning: st.timerRunning,
        muted: st.muted, musicOn: st.musicOn, hostPin: st.hostPin, reflections: st.reflections,
      }),
    },
  ),
);
