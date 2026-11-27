// 방장(선생님 기기): 게임을 계산하고, 상태를 참여 기기에 보내고, 받은 액션을 검사해 적용한다.
import { NATIONS, type PlayerNation } from '../data/gameData';
import { actorOf } from '../engine/selectors';
import type { PlayerId } from '../engine/types';
import { useGame } from '../store/gameStore';
import { useNet } from './netStore';
import { remoteAllowed, slimGame, type NetMsg } from './protocol';
import { openTransport, type Transport } from './transport';

const ORDER = Object.keys(NATIONS) as PlayerNation[];
let current: { room: string; t: Transport; unsub: () => void } | null = null;

export async function startHost(room: string) {
  if (current?.room === room) return;
  stopHost();
  useNet.getState().set({ role: 'host', room });
  // 저장된 게임이 있으면 자리 정보를 되살린다
  const sess = useGame.getState().session;
  if (sess.mode === 'online' && sess.room === room) useNet.getState().set({ seats: sess.seats ?? {}, names: sess.names ?? {} });

  const t = await openTransport(room, onMsg, (status) => {
    useNet.getState().set({ status });
    if (status === 'connected') broadcastAll();
  });
  useNet.getState().set({ kind: t.kind });

  // 게임 상태가 바뀔 때마다 모두에게 보낸다
  const unsub = useGame.subscribe((st, prev) => {
    if (st.game !== prev.game || st.session !== prev.session) sendState();
    else if (st.elapsedSec !== prev.elapsedSec) t.send({ t: 'tick', elapsedSec: st.elapsedSec });
  });
  current = { room, t, unsub };
  broadcastAll();
}

export function stopHost() {
  if (!current) return;
  current.t.send({ t: 'closed' });
  current.unsub();
  current.t.close();
  current = null;
  useNet.getState().set({ role: 'none', room: null, status: 'idle', kind: null, seats: {}, names: {}, hostSetup: null });
}

function broadcastAll() {
  if (useGame.getState().game) sendState();
  else sendLobby();
}

function sendLobby() {
  const n = useNet.getState();
  current?.t.send({ t: 'lobby', seats: n.seats, names: n.names, aiFill: n.aiFill });
}

function sendState() {
  const { game, elapsedSec, session } = useGame.getState();
  if (!game || !current) return;
  current.t.send({ t: 'state', game: slimGame(game), elapsedSec, seats: session.seats ?? {}, names: session.names ?? {}, ai: session.ai });
}

function onMsg(m: NetMsg) {
  const net = useNet.getState();
  const gs = useGame.getState();
  const game = gs.game;
  switch (m.t) {
    case 'hello':
      broadcastAll();
      return;
    case 'claim': {
      if (!game) {
        // 대기실: 비어 있거나 내 자리면 앉기 (다른 자리에 있었다면 옮김)
        const owner = net.seats[m.nation];
        if (owner && owner !== m.from) return reject(m.from, `${NATIONS[m.nation].name}은(는) 이미 다른 모둠이 골랐습니다.`);
        const seats = { ...net.seats };
        const names = { ...net.names };
        for (const k of ORDER) if (seats[k] === m.from) { delete seats[k]; delete names[k]; }
        seats[m.nation] = m.from;
        names[m.nation] = m.name;
        net.set({ seats, names });
        sendLobby();
        return;
      }
      // 게임 중: 원래 내 자리(다시 접속)이거나 AI가 두던 자리면 들어올 수 있음
      const sess = gs.session;
      const mine = sess.seats?.[m.nation] === m.from;
      const aiSeat = sess.ai.includes(m.nation) && game.players.some((p) => p.id === m.nation && !p.bankrupt);
      if (!mine && !aiSeat) return reject(m.from, '게임이 이미 시작되어 그 나라를 고를 수 없습니다.');
      const seats = { ...(sess.seats ?? {}), [m.nation]: m.from };
      const names = { ...(sess.names ?? {}), [m.nation]: m.name };
      gs.setSession({ seats, names, ai: sess.ai.filter((x) => x !== m.nation) });
      net.set({ seats, names });
      return;
    }
    case 'leave': {
      if (game) return; // 게임 중 나가면 자리는 남겨 둔다 (관리 화면에서 AI로 넘길 수 있음)
      const seats = { ...net.seats };
      for (const k of ORDER) if (seats[k] === m.from) delete seats[k];
      net.set({ seats });
      sendLobby();
      return;
    }
    case 'action': {
      if (!game) return;
      if (gs.session.seats?.[m.nation] !== m.from) return reject(m.from, '이 기기는 그 나라의 자리가 아닙니다.');
      if (!remoteAllowed(actorOf(game), m.nation, m.action)) return reject(m.from, '지금은 다른 나라가 결정할 차례입니다.');
      if (!gs.dispatch(m.action)) reject(m.from, '지금은 할 수 없는 행동입니다.');
      return;
    }
    default:
      return;
  }
}

function reject(to: string, reason: string) {
  current?.t.send({ t: 'reject', to, reason });
}

/** 방장이 대기실에서 게임 시작: 앉은 나라 + (빈자리 AI 채우기면) 나머지 */
export function hostStartGame() {
  const net = useNet.getState();
  if (!net.room || !net.hostSetup) return;
  const seated = ORDER.filter((n) => net.seats[n]);
  const nations = net.aiFill ? ORDER : seated;
  const ai = nations.filter((n) => !net.seats[n]) as PlayerId[];
  useGame.getState().newGame(nations, net.hostSetup.settings, net.hostSetup.pin, {
    mode: 'online', room: net.room, seats: net.seats, names: net.names, ai,
  });
  net.set({ hostSetup: null });
}
