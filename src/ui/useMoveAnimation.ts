import { useEffect, useRef, useState } from 'react';
import type { GameState, PlayerId } from '../engine/types';
import { sound } from './sound';

export const ROLL_MS = 1400; // 주사위 굴림 연출·소리 길이
export const STEP_MS = 280; // 한 칸 걷는 시간

const positions = (g: GameState) => Object.fromEntries(g.players.map((p) => [p.id, p.position])) as Record<PlayerId, number>;

/**
 * 엔진은 이동 결과를 즉시 계산하고, 화면은 move.seq가 바뀔 때
 * 주사위 굴림(1초) → 한 칸씩 걸어서 이동(칸당 STEP_MS)을 연출한다. 연출 중에는 busy=true.
 *
 * 주의: 주사위를 굴리면 엔진이 곧바로 다음 결정(확보 여부 등)을 만든다. 연출이 시작되기 전
 * 첫 화면에서도 busy·rolling이 참이어야 주사위 창이 사라지지 않고 말이 도착 칸으로 순간이동하지 않는다.
 * 그래서 '아직 연출하지 않은 이동'(pendingMove)을 렌더링 중에 바로 계산해 함께 돌려준다.
 */
export function useMoveAnimation(game: GameState) {
  const [disp, setDisp] = useState(() => positions(game));
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [walker, setWalker] = useState<PlayerId | null>(null);
  const seqRef = useRef(game.move.seq);
  const busyRef = useRef(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  const pendingMove = game.move.seq > seqRef.current && !!game.move.player;

  useEffect(() => {
    const seq = game.move.seq;
    if (seq <= seqRef.current) {
      // 되돌리기 등으로 seq가 줄었으면 연출 없이 맞춘다
      seqRef.current = seq;
      busyRef.current = false;
      setBusy(false);
      setRolling(false);
      setWalker(null);
      setDisp(positions(gameRef.current));
      return;
    }
    seqRef.current = seq;
    const { player, from, path, kind } = game.move;
    if (!player) return;
    const timers: number[] = [];
    busyRef.current = true;
    setBusy(true);
    setDisp((d) => ({ ...d, [player]: from }));
    const finish = () => {
      setWalker(null);
      busyRef.current = false;
      setBusy(false);
      setDisp(positions(gameRef.current));
    };
    const startMove = () => {
      setRolling(false);
      if (!path.length) return finish();
      setWalker(player);
      path.forEach((pos, i) => {
        timers.push(window.setTimeout(() => {
          setDisp((d) => ({ ...d, [player]: pos }));
          sound.footstep(0);
          timers.push(window.setTimeout(() => sound.footstep(1), STEP_MS / 2));
          if (i === path.length - 1) timers.push(window.setTimeout(finish, STEP_MS + 120));
        }, i * STEP_MS + 30));
      });
    };
    if (kind === 'dice') {
      setRolling(true);
      sound.dice();
      timers.push(window.setTimeout(startMove, ROLL_MS));
    } else timers.push(window.setTimeout(startMove, 200));
    return () => timers.forEach(clearTimeout);
  }, [game.move.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // 연출 중이 아닐 때는 엔진 위치와 동기화 (수동 조정·불러오기 등)
  useEffect(() => {
    if (!busyRef.current) setDisp(positions(game));
  }, [game, busy]);

  return {
    disp,
    walker,
    rolling: rolling || (pendingMove && game.move.kind === 'dice'),
    busy: busy || pendingMove,
  };
}
