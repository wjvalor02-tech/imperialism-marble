// 배경음악·효과음이 함께 쓰는 오디오 장치.
//
// 휴대폰(특히 아이폰·카카오톡 등 앱 안 브라우저)에서 소리가 나지 않는 문제 대응:
// 1) 오디오는 '사용자가 화면을 탭한 그 순간'(touchend/click) 안에서 만들고 깨워야 한다.
//    pointerdown이나 나중에 실행되는 코드에서 만들면 막혀서 영영 '일시정지' 상태로 남는다.
// 2) 아이폰은 무음 스위치가 켜져 있으면 웹 오디오를 꺼 버린다.
//    → navigator.audioSession.type = 'playback' (iOS 17+), 그 이전 버전은 무음 <audio>를 함께 재생해
//      '재생' 모드로 바꾸는 방법을 쓴다.

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;
let silentEl: HTMLAudioElement | null = null;

export function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** 아주 짧은 무음 WAV (재생 모드 전환용) */
function silentWavUrl(): string {
  const rate = 8000, n = 800; // 0.1초
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** 반드시 탭·클릭 이벤트 안에서 부른다 */
export function unlockAudio() {
  try {
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch { /* 지원하지 않는 브라우저 */ }
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  // 무음 버퍼를 한 번 재생해 오디오를 깨운다 (아이폰)
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch { /* 무시 */ }
  // 무음 스위치를 넘어 소리가 나도록 무음 <audio>를 반복 재생 (iOS 17 이전용)
  if (!silentEl && !(navigator as AudioSessionNavigator).audioSession) {
    silentEl = new Audio(silentWavUrl());
    silentEl.loop = true;
    silentEl.setAttribute('playsinline', '');
    void silentEl.play().catch(() => { silentEl = null; });
  }
}

export const audioReady = () => ctx?.state === 'running';

/** 첫 탭부터 오디오가 켜질 때까지 탭마다 깨운다. onUnlock은 탭 이벤트 안에서 실행됨 */
export function installAudioUnlock(onTap: () => void) {
  const handler = () => {
    unlockAudio();
    onTap();
  };
  for (const ev of ['touchend', 'click', 'keydown'] as const) window.addEventListener(ev, handler, { passive: true });
  return () => { for (const ev of ['touchend', 'click', 'keydown'] as const) window.removeEventListener(ev, handler); };
}
