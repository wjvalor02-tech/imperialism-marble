import { actorOf } from '../engine/selectors';
import type { GameState, PlayerId } from '../engine/types';
import { useNet } from '../net/netStore';
import { useGame } from '../store/gameStore';

/**
 * 황금열쇠 카드 내용을 이 기기에서 보여 줘도 되는 나라인지.
 * - 온라인 학생 기기: 자기 나라만
 * - 싱글모드: 사람이 맡은 나라만 (AI 카드는 숨김)
 * - 온라인 방장(전자칠판): 모두에게 보이는 화면이므로 숨김
 * - 한 화면 모드: 지금 차례인 나라만 (카드를 뽑을 때는 '우리 모둠만 보기'를 눌러야 펼쳐짐)
 */
export function useCardVisibility(game: GameState): (nation: PlayerId) => boolean {
  const role = useNet((s) => s.role);
  const myNation = useNet((s) => s.myNation);
  const session = useGame((s) => s.session);
  const actor = actorOf(game);
  return (nation) => {
    if (role === 'client') return nation === myNation;
    if (session.mode === 'single') return nation === session.me;
    if (session.mode === 'online') return false;
    return nation === actor;
  };
}
