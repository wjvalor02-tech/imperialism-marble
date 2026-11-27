import { useEffect } from 'react';
import { aiDelayMs, chooseAiAction } from '../engine/ai';
import { actorOf } from '../engine/selectors';
import type { GameState } from '../engine/types';
import { useNet } from '../net/netStore';
import { useGame } from '../store/gameStore';

/** AI 나라의 차례·응답이면 잠시 뒤 자동으로 둔다 (방장/싱글 기기에서만) */
export function useAiDriver(game: GameState, busy: boolean) {
  const ai = useGame((s) => s.session.ai);
  const role = useNet((s) => s.role);
  useEffect(() => {
    if (role === 'client' || busy || game.phase !== 'PLAYING') return;
    const actor = actorOf(game);
    if (!ai.includes(actor)) return;
    const t = window.setTimeout(() => {
      const g = useGame.getState().game;
      if (g !== game) return; // 그 사이 상태가 바뀌었으면 다음 기회에
      useGame.getState().dispatch(chooseAiAction(game, actor));
    }, aiDelayMs(game));
    return () => clearTimeout(t);
  }, [game, busy, ai, role]);
}
