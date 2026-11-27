import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import Board from '../components/Board';
import CardTargetModal from '../components/CardTargetModal';
import ColonyModal from '../components/ColonyModal';
import DecisionModal from '../components/DecisionModal';
import HostPanel from '../components/HostPanel';
import PlayerPanel from '../components/PlayerPanel';
import TopBar from '../components/TopBar';
import { sound } from '../sound';
import { ControlContext } from '../controlContext';
import { useAiDriver } from '../useAiDriver';
import { useControl } from '../useControl';
import { useMoveAnimation } from '../useMoveAnimation';

export default function GameScreen({ game }: { game: GameState }) {
  const { disp, rolling, busy, walker } = useMoveAnimation(game);
  const [tile, setTile] = useState<number | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [host, setHost] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const elapsed = useGame((s) => s.elapsedSec);
  const control = useControl(game);
  useAiDriver(game, busy);

  // 효과음: 새 로그를 보고 판단
  const seen = useRef(game.logSeq);
  useEffect(() => {
    const fresh = game.log.filter((l) => l.id > seen.current);
    seen.current = game.logSeq;
    if (fresh.some((l) => l.text.startsWith('⚔'))) sound.war();
    else if (fresh.some((l) => l.text.startsWith('🔑'))) sound.key();
    else if (fresh.some((l) => l.kind === 'money' && l.to !== 'BANK' && l.to !== 'CHINA_POOL')) sound.coin();
  }, [game.logSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // 종료 5분 전 알림
  const limit = game.settings.timeLimitMinutes * 60;
  useEffect(() => {
    if (limit > 0 && limit - elapsed === 300) {
      setToast('⏰ 수업 종료 5분 전입니다! 타이머가 끝나면 식민지 점수 1위가 승리합니다.');
      const t = window.setTimeout(() => setToast(null), 8000);
      return () => clearTimeout(t);
    }
  }, [elapsed, limit]);

  const canAct = !game.pending && !busy && control.canControl;

  return (
    <ControlContext.Provider value={control}>
    <div className="game">
      <TopBar game={game} onHost={() => setHost(true)} />
      {toast && <div className="toast" role="alert">{toast}</div>}
      <main className="game-main">
        <Board game={game} disp={disp} rolling={rolling} busy={busy} walker={walker} onTile={(i) => { if (!game.pending && !busy) setTile(i); }} />
        <PlayerPanel game={game} canAct={canAct} onUseCard={setCard} />
      </main>
      {!busy && !host && <DecisionModal game={game} />}
      {tile !== null && !game.pending && <ColonyModal game={game} index={tile} onClose={() => setTile(null)} />}
      {card && canAct && <CardTargetModal game={game} cardId={card} onClose={() => setCard(null)} />}
      {host && <HostPanel game={game} onClose={() => setHost(false)} />}
    </div>
    </ControlContext.Provider>
  );
}
