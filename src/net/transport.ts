// 기기 사이에 메시지를 주고받는 통로.
// - Supabase Realtime(브로드캐스트): .env.local에 주소·키가 있으면 사용 → 서로 다른 기기 간 온라인 연결
// - BroadcastChannel: 설정이 없을 때 시험용 → 같은 컴퓨터의 다른 탭끼리만 연결
import type { NetMsg } from './protocol';

export type TransportKind = 'supabase' | 'local';
export type LinkStatus = 'connecting' | 'connected' | 'error';

export interface Transport {
  kind: TransportKind;
  send: (msg: NetMsg) => void;
  close: () => void;
}

// 프로젝트 주소만 필요하다 (https://xxxx.supabase.co). 대시보드에서 REST 주소(…/rest/v1/)를
// 복사해 넣어도 동작하도록 뒤쪽 경로와 슬래시를 떼어 낸다.
const SB_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const onlineConfigured = Boolean(SB_URL && SB_KEY);

export async function openTransport(room: string, onMsg: (m: NetMsg) => void, onStatus: (s: LinkStatus) => void): Promise<Transport> {
  const name = `imperial-marble:${room}`;
  if (onlineConfigured) {
    onStatus('connecting');
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(SB_URL!, SB_KEY!, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } });
    const ch = sb.channel(name, { config: { broadcast: { self: false, ack: false } } });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload as NetMsg));
    ch.subscribe((st) => onStatus(st === 'SUBSCRIBED' ? 'connected' : st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' ? 'error' : 'connecting'));
    return {
      kind: 'supabase',
      send: (msg) => { void ch.send({ type: 'broadcast', event: 'm', payload: msg }); },
      close: () => { void sb.removeChannel(ch); },
    };
  }
  const bc = new BroadcastChannel(name);
  bc.onmessage = (e) => onMsg(e.data as NetMsg);
  onStatus('connected');
  return { kind: 'local', send: (msg) => bc.postMessage(msg), close: () => bc.close() };
}

/** 헷갈리는 글자(0/O, 1/I)를 뺀 6자리 방 코드 */
export function makeRoomCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}
