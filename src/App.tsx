import { useEffect, useRef, useState } from 'react';
import { joinRoom } from './net/client';
import { startHost, stopHost } from './net/host';
import { useNet } from './net/netStore';
import { isClientTab, useGame, type GameMode } from './store/gameStore';
import GameOverScreen from './ui/screens/GameOverScreen';
import GameScreen from './ui/screens/GameScreen';
import HostLobbyScreen from './ui/screens/HostLobbyScreen';
import JoinScreen from './ui/screens/JoinScreen';
import ModeScreen from './ui/screens/ModeScreen';
import ReflectionScreen from './ui/screens/ReflectionScreen';
import ResumeScreen from './ui/screens/ResumeScreen';
import SetupScreen from './ui/screens/SetupScreen';

const wantsJoin = () => isClientTab() || new URLSearchParams(location.search).has('room');

export default function App() {
  const game = useGame((s) => s.game);
  const session = useGame((s) => s.session);
  const tick = useGame((s) => s.tick);
  const net = useNet();
  const [setupMode, setSetupMode] = useState<GameMode | null>(null);
  const [joining, setJoining] = useState(wantsJoin);
  // 새로고침 후 저장된 게임이 있으면 [이어하기]부터 묻는다 (그동안 타이머는 멈춤)
  const [askResume, setAskResume] = useState(() => !wantsJoin() && useGame.getState().game?.phase === 'PLAYING');

  // 학생 탭: 새로고침해도 같은 방에 다시 접속
  useEffect(() => {
    const room = isClientTab() ? sessionStorage.getItem('imperial-room') : null;
    if (room) void joinRoom(room);
  }, []);

  // 방장: 대기실이거나 온라인 게임 중이면 연결 유지
  useEffect(() => {
    if (net.role === 'client') return;
    if (net.role === 'host' && net.room && !game) void startHost(net.room);
    else if (game && session.mode === 'online' && session.room && !askResume) void startHost(session.room);
  }, [net.role, net.room, game, session.mode, session.room, askResume]);

  // 온라인 게임을 끝내고 처음 화면으로 가면 방을 닫는다
  const hadGame = useRef(!!game);
  useEffect(() => {
    if (hadGame.current && !game && net.role === 'host' && !net.hostSetup) stopHost();
    if (!game) { setAskResume(false); setSetupMode(null); }
    hadGame.current = !!game;
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (askResume || net.role === 'client') return;
    const t = window.setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [tick, askResume, net.role]);

  // ── 학생 기기 ──
  if (joining || net.role === 'client') {
    const seated = net.myNation && net.seats[net.myNation] === net.clientId;
    if (game && seated) return route(game);
    return <JoinScreen />;
  }

  // ── 방장·싱글·한 화면 ──
  if (!game) {
    if (net.role === 'host' && net.hostSetup) return <HostLobbyScreen />;
    if (setupMode) return <SetupScreen mode={setupMode} onBack={() => setSetupMode(null)} />;
    return <ModeScreen onPick={setSetupMode} onJoin={() => setJoining(true)} />;
  }
  if (askResume && game.phase === 'PLAYING') return <ResumeScreen game={game} onResume={() => setAskResume(false)} />;
  return route(game);
}

function route(game: NonNullable<ReturnType<typeof useGame.getState>['game']>) {
  if (game.phase === 'GAME_OVER') return <GameOverScreen game={game} />;
  if (game.phase === 'REFLECTION') return <ReflectionScreen game={game} />;
  return <GameScreen game={game} />;
}
