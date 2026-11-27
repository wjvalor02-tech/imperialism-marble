import { NATIONS } from '../../data/gameData';
import { askConfirm } from '../confirm';
import type { GameState } from '../../engine/types';
import { leaveRoom } from '../../net/client';
import { useNet } from '../../net/netStore';
import { useGame } from '../../store/gameStore';
import { startMusic } from '../music';
import Flag from './Flag';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function TopBar({ game, onHost }: { game: GameState; onHost: () => void }) {
  const { elapsedSec, timerRunning, muted, setMuted, session, musicOn, setMusicOn } = useGame();
  const { role, myNation, room, status, kind } = useNet();
  const limit = game.settings.timeLimitMinutes * 60;
  const left = Math.max(0, limit - elapsedSec);
  const warn = limit > 0 && left <= 300;
  const me = role === 'client' ? myNation : session.mode === 'single' ? session.me : null;
  return (
    <header className="topbar">
      <div className="brand">제국주의 마블</div>
      {me && <span className="me-badge"><Flag id={me} size={18} /> 나: {NATIONS[me].name}</span>}
      {session.mode === 'single' && role !== 'client' && <span className="mode-badge">싱글모드 · AI 3개국</span>}
      {(role === 'host' || role === 'client') && room && (
        <span className={`mode-badge ${status === 'error' ? 'bad' : ''}`}>
          모둠모드 · 방 {room}{kind === 'local' ? ' (시험 연결)' : ''}{status === 'error' ? ' · 연결 끊김' : ''}
        </span>
      )}
      <div className={`timer ${warn ? 'warn' : ''} ${game.timeUp ? 'over' : ''}`} role="timer" aria-live="off">
        {limit > 0 ? (
          game.timeUp ? '시간 종료 — 이번 차례까지' : <>남은 시간 <b>{mmss(left)}</b>{!timerRunning && ' (일시정지)'}{warn && ' · 곧 종료!'}</>
        ) : <>경과 {mmss(elapsedSec)}</>}
      </div>
      <div className="top-actions">
        <button className={`btn small ${musicOn ? '' : 'off'}`} onClick={() => { if (!musicOn) startMusic(); setMusicOn(!musicOn); }} aria-label={musicOn ? '배경음악 끄기' : '배경음악 켜기'} title="배경음악">🎵</button>
        <button className="btn small" onClick={() => setMuted(!muted)} aria-label={muted ? '효과음 켜기' : '효과음 끄기'} title="효과음">{muted ? '🔇' : '🔊'}</button>
        {role === 'client'
          ? <button className="btn small" onClick={() => askConfirm('방에서 나갈까요? (다시 코드를 입력하면 같은 나라로 돌아올 수 있어요)', leaveRoom, '나가기')}>나가기</button>
          : <button className="btn small" onClick={onHost}>진행자</button>}
      </div>
    </header>
  );
}
