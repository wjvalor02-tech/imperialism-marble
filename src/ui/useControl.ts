import { NATIONS } from '../data/gameData';
import { actorOf } from '../engine/selectors';
import type { GameState, PlayerId } from '../engine/types';
import { useNet } from '../net/netStore';
import { useGame } from '../store/gameStore';

export interface Control {
  canControl: boolean; // 이 기기에서 지금 결정 버튼을 눌러도 되는지
  actor: PlayerId; // 지금 결정할 나라
  isAi: boolean;
  waiting: string; // 다른 나라가 결정할 때 보여 줄 문구
  hotseat: boolean; // 한 화면 모드 (응답 전환 화면 필요)
}

export function useControl(game: GameState): Control {
  const session = useGame((s) => s.session);
  const role = useNet((s) => s.role);
  const myNation = useNet((s) => s.myNation);
  const actor = actorOf(game);
  const isAi = session.ai.includes(actor);
  const name = NATIONS[actor].name;
  // AI가 두는 나라도 게임 중에는 나라 이름만 보여 준다 (예: "프랑스가 결정하는 중…")
  const who = isAi ? name : session.names?.[actor] ? `${name}(${session.names[actor]})` : `${name} 모둠`;
  // 조사는 마지막 한글 글자의 받침으로 고른다 (예: '프랑스(3모둠)' → 둠 → '이')
  const last = [...who].reverse().find((ch) => /[가-힣]/.test(ch)) ?? '가';
  const waiting = `${who}${(last.charCodeAt(0) - 0xac00) % 28 ? '이' : '가'} 결정하는 중…`;

  let canControl = true;
  if (role === 'client') canControl = actor === myNation;
  else if (session.mode === 'online') canControl = !isAi && !!session.hostTakeover;
  else if (session.mode === 'single') canControl = !isAi;
  return { canControl, actor, isAi, waiting, hotseat: session.mode === 'hotseat' && role !== 'client' };
}
