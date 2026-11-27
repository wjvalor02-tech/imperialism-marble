// 배경음악: Web Audio로 실시간 작곡 (파일·저작권 없음).
// 라단조, 72 BPM의 무겁고 긴장감 있는 행진곡 느낌.
// - 낮은 드론 + 저음 현악 오스티나토(Dm–B♭–Gm–A, 마지막 A에서 긴장)
// - 마디마다 팀파니, 군악 스네어, 느리게 깔리는 현악 화음, 홀 잔향

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let drone: OscillatorNode[] = [];
let timer: number | null = null;
let nextTime = 0;
let step = 0;

const BPM = 72;
const EIGHTH = 60 / BPM / 2;
const VOLUME = 0.32;
// 2마디(16개의 8분음표)마다 바뀌는 화음 [근음, 화음 구성음들] (MIDI 번호)
const PROG: { root: number; chord: number[] }[] = [
  { root: 38, chord: [50, 53, 57] }, // Dm
  { root: 34, chord: [50, 53, 58] }, // B♭
  { root: 31, chord: [50, 55, 58] }, // Gm
  { root: 33, chord: [49, 52, 57] }, // A (긴장)
];
const OSTINATO = [0, 0, 12, 0, 0, 0, 8, 7]; // 8분음표 패턴 (반음 단위)

const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function impulse(c: AudioContext, sec: number) {
  const len = Math.floor(c.sampleRate * sec);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
  }
  return buf;
}

function voice(type: OscillatorType, freq: number, t: number, dur: number, vol: number, cutoff: number, attack = 0.01, send = 0.25) {
  const c = ctx!;
  const o = c.createOscillator();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g);
  g.connect(master!);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s).connect(wet!);
  }
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(t: number, dur: number, vol: number, hp: number, send = 0.2) {
  const c = ctx!;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master!);
  const s = c.createGain();
  s.gain.value = send;
  g.connect(s).connect(wet!);
  src.start(t);
}

function timpani(t: number, vol: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.5);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g).connect(master!);
  const s = c.createGain();
  s.gain.value = 0.35;
  g.connect(s).connect(wet!);
  o.start(t);
  o.stop(t + 1.2);
  noise(t, 0.05, vol * 0.25, 600, 0.1);
}

function playStep(s: number, t: number) {
  const bar = Math.floor(s / 8);
  const { root, chord } = PROG[Math.floor(bar / 2) % PROG.length];
  const inBar = s % 8;
  // 현악 화음: 2마디마다 천천히 부풀었다 사라짐
  if (s % 16 === 0) for (const m of chord) {
    voice('sawtooth', hz(m), t, EIGHTH * 16, 0.022, 1100, 1.4, 0.5);
    voice('sawtooth', hz(m) * 1.004, t, EIGHTH * 16, 0.016, 900, 1.6, 0.5);
  }
  // 저음 오스티나토 (첫 박 강조)
  voice('sawtooth', hz(root + OSTINATO[inBar]), t, EIGHTH * 0.95, inBar === 0 ? 0.11 : 0.07, 520, 0.008, 0.15);
  // 팀파니: 마디 첫 박, 셋째 박 약하게
  if (inBar === 0) timpani(t, 0.5);
  if (inBar === 4) timpani(t, 0.22);
  // 군악 스네어: 둘째·넷째 박, 8마디마다 끝에서 롤
  if (inBar === 2 || inBar === 6) noise(t, 0.12, 0.05, 1800);
  if (bar % 8 === 7 && inBar >= 4) for (let k = 0; k < 4; k++) noise(t + (k * EIGHTH) / 4, 0.06, 0.025 + 0.012 * (inBar - 4 + k / 4), 2000);
  // 16마디마다 높은 현악 한 음으로 긴장감
  if (s % 128 === 96) voice('triangle', hz(81), t, EIGHTH * 16, 0.018, 3000, 2.5, 0.6);
}

function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.3) {
    playStep(step, nextTime);
    nextTime += EIGHTH;
    step++;
  }
}

export function startMusic() {
  if (timer !== null) return;
  try {
    ctx ??= new AudioContext();
  } catch {
    return;
  }
  const c = ctx;
  void c.resume();
  master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.exponentialRampToValueAtTime(VOLUME, c.currentTime + 2.5); // 천천히 들어옴
  master.connect(c.destination);
  const rev = c.createConvolver();
  rev.buffer = impulse(c, 3.2);
  wet = c.createGain();
  wet.gain.value = 0.55;
  wet.connect(rev).connect(master);
  // 낮게 깔리는 드론 (D1 + A1), 필터가 천천히 숨 쉼
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 180;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 70;
  lfo.connect(lfoGain).connect(lp.frequency);
  const dg = c.createGain();
  dg.gain.value = 0.05;
  lp.connect(dg).connect(master);
  drone = [hz(26), hz(33), hz(26) * 1.003].map((f) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(lp);
    o.start();
    return o;
  });
  lfo.start();
  drone.push(lfo);
  nextTime = c.currentTime + 0.1;
  step = 0;
  timer = window.setInterval(schedule, 80);
}

export function stopMusic() {
  if (timer === null || !ctx || !master) return;
  window.clearInterval(timer);
  timer = null;
  const m = master;
  const now = ctx.currentTime;
  m.gain.cancelScheduledValues(now);
  m.gain.setValueAtTime(m.gain.value, now);
  m.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  const ds = drone;
  drone = [];
  window.setTimeout(() => { ds.forEach((o) => { try { o.stop(); } catch { /* 이미 멈춤 */ } }); m.disconnect(); }, 900);
  master = null;
}

export const isMusicPlaying = () => timer !== null;

// 탭을 다른 데로 옮기면 잠시 멈춤
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx || timer === null) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
}
