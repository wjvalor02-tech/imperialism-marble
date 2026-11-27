// 참여 기기(학생): 방장에게 상태를 받아 화면에 그리고, 내 차례의 행동만 방장에게 보낸다.
import type { PlayerId } from '../engine/types';
import { setRemoteSink, useGame } from '../store/gameStore';
import { useNet } from './netStore';
import type { NetMsg } from './protocol';
import { openTransport, type Transport } from './transport';

let t: Transport | null = null;
const SS = sessionStorage;

export function clientId(): string {
  let id = SS.getItem('imperial-client-id');
  if (!id) { id = Math.random().toString(36).slice(2, 10); SS.setItem('imperial-client-id', id); }
  return id;
}

/** 이 탭을 참여 기기로 표시 (이 탭은 저장 게임을 건드리지 않음) */
export const markClientTab = () => SS.setItem('imperial-role', 'client');

export async function joinRoom(room: string) {
  markClientTab();
  SS.setItem('imperial-room', room);
  // 이 기기에 저장된 다른 게임은 그대로 두고, 화면에서만 비운다 (참여 탭은 저장하지 않음)
  useGame.setState({ game: null, past: [], session: { mode: 'online', ai: [] } });
  const id = clientId();
  useNet.getState().set({ role: 'client', room, clientId: id, notice: null, myNation: SS.getItem('imperial-nation') as PlayerId | null });
  t?.close();
  t = await openTransport(room, onMsg, (status) => {
    useNet.getState().set({ status });
    if (status === 'connected') hello();
  });
  useNet.getState().set({ kind: t.kind });
  hello();
  setRemoteSink((action) => {
    const me = useNet.getState().myNation;
    if (me) t?.send({ t: 'action', from: id, nation: me, action });
  });
}

function hello() {
  const id = clientId();
  t?.send({ t: 'hello', from: id });
  // 새로고침 후 다시 접속: 고른 나라를 다시 알림
  const me = SS.getItem('imperial-nation') as PlayerId | null;
  if (me) t?.send({ t: 'claim', from: id, nation: me, name: SS.getItem('imperial-name') ?? '' });
}

export function claimNation(nation: PlayerId, name: string) {
  SS.setItem('imperial-nation', nation);
  SS.setItem('imperial-name', name);
  useNet.getState().set({ myNation: nation, notice: null });
  t?.send({ t: 'claim', from: clientId(), nation, name });
}

export function leaveRoom() {
  t?.send({ t: 'leave', from: clientId() });
  t?.close();
  t = null;
  setRemoteSink(null);
  for (const k of ['imperial-role', 'imperial-room', 'imperial-nation', 'imperial-name']) SS.removeItem(k);
  location.href = location.pathname; // 주소의 ?room= 제거하고 처음 화면으로
}

function onMsg(m: NetMsg) {
  const net = useNet.getState();
  const me = net.clientId;
  switch (m.t) {
    case 'lobby':
      net.set({ seats: m.seats, names: m.names, aiFill: m.aiFill });
      // 내 자리가 다른 사람에게 넘어갔으면 선택 해제
      if (net.myNation && m.seats[net.myNation] && m.seats[net.myNation] !== me) {
        SS.removeItem('imperial-nation');
        net.set({ myNation: null });
      }
      return;
    case 'state':
      net.set({ seats: m.seats, names: m.names });
      useGame.setState({ game: m.game, elapsedSec: m.elapsedSec, session: { mode: 'online', ai: m.ai, seats: m.seats, names: m.names } });
      return;
    case 'tick':
      useGame.setState({ elapsedSec: m.elapsedSec });
      return;
    case 'reject':
      if (m.to === me) net.set({ notice: m.reason });
      return;
    case 'closed':
      net.set({ notice: '선생님이 방을 닫았습니다.' });
      return;
    default:
      return;
  }
}
