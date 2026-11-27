import type { Action, GameState, PlayerId } from '../engine/types';

export type Seats = Partial<Record<PlayerId, string>>; // 나라 → 학생 기기 id
export type Names = Partial<Record<PlayerId, string>>;

/** 방장(선생님 기기)과 참여 기기(학생) 사이의 메시지. 게임 계산은 방장만 한다. */
export type NetMsg =
  | { t: 'hello'; from: string } // 참여 → 방장: 지금 상태를 보내 달라
  | { t: 'claim'; from: string; nation: PlayerId; name: string } // 나라 선택
  | { t: 'leave'; from: string }
  | { t: 'lobby'; seats: Seats; names: Names; aiFill: boolean } // 방장 → 모두: 대기실
  | { t: 'state'; game: GameState; elapsedSec: number; seats: Seats; names: Names; ai: PlayerId[] }
  | { t: 'tick'; elapsedSec: number }
  | { t: 'action'; from: string; nation: PlayerId; action: Action } // 참여 → 방장
  | { t: 'reject'; to: string; reason: string }
  | { t: 'closed' }; // 방장이 방을 닫음

/** 참여 기기가 보낸 액션을 받아도 되는지 (방장이 검사) */
export function remoteAllowed(actor: PlayerId, nation: PlayerId, action: Action): boolean {
  if (action.type.startsWith('HOST_') || action.type === 'TIME_UP') return false;
  if (action.type === 'GO_REFLECTION') return true;
  return actor === nation;
}

/** 전송량을 줄이려고 로그는 최근 것만 보낸다 */
export const slimGame = (g: GameState): GameState => ({ ...g, log: g.log.slice(-40) });
