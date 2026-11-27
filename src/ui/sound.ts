// 외부 파일 없이 Web Audio로 만든 짧은 효과음
import { useGame } from '../store/gameStore';
import { getCtx } from './audio';

// 배경음악과 같은 오디오 장치를 쓴다 (휴대폰에서는 첫 탭 때 깨워 둔 것)
function ac(): AudioContext | null {
  if (useGame.getState().muted) return null;
  const c = getCtx();
  if (!c) return null;
  if (c.state === 'suspended') void c.resume();
  return c;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sound = {
  /**
   * 주사위 굴림: 나무 탁자 위에 주사위 2개를 던졌을 때처럼
   * 딱(첫 충돌) → 딱 … 딱 … 딱 (천천히 짧아지며 작게 튐) → 드르르 구르다 멈춤 (약 1.4초)
   */
  dice() {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + 0.01;
    const r = Math.random;
    // 단단한 플라스틱이 부딪히는 딱 + 나무 탁자가 울리는 톡
    const clack = (t: number, vol: number) => {
      const len = Math.floor(c.sampleRate * 0.03);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * (1 - i / len) ** 6;
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600 + r() * 1800;
      bp.Q.value = 2.5;
      const g = c.createGain();
      g.gain.value = vol;
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = 'triangle';
      const f0 = 700 + r() * 600;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.04);
      og.gain.setValueAtTime(vol * 0.35, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(og).connect(c.destination);
      o.start(t);
      o.stop(t + 0.06);
    };
    // 주사위 두 개가 살짝 엇갈려 튕긴다
    for (let die = 0; die < 2; die++) {
      let t = t0 + die * (0.05 + r() * 0.05);
      let gap = 0.24 + r() * 0.05;
      let vol = 0.55;
      for (let k = 0; k < 12 && t - t0 < 1.3; k++) {
        clack(t, vol);
        // 구르는 동안 사이사이 작은 드르르
        if (k >= 2) clack(t + gap / 2 + r() * 0.015, vol * 0.25);
        t += gap;
        gap *= 0.8 + r() * 0.06;
        gap = Math.max(gap, 0.06);
        vol *= 0.8;
      }
    }
    // 탁자가 웅 울리는 낮은 소리
    const len = Math.floor(c.sampleRate * 1.3);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource();
    src.buffer = buf;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const g = c.createGain();
    g.gain.value = 0.16;
    src.connect(lp).connect(g).connect(c.destination);
    src.start(t0);
  },
  step() { tone(520, 0, 0.05, 'triangle', 0.06); },
  /** 장화 발소리: 낮은 쿵 + 나무판 긁힘. foot 0/1로 좌우 발 높이를 조금 다르게 */
  footstep(foot: 0 | 1) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    const pitch = foot ? 0.86 : 1;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(60 * pitch, t + 0.09);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.13);
    const len = Math.floor(c.sampleRate * 0.07);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 * pitch;
    bp.Q.value = 1.2;
    const ng = c.createGain();
    ng.gain.value = 0.18;
    src.connect(bp).connect(ng).connect(c.destination);
    src.start(t);
  },
  coin() { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.08, 0.18, 'square', 0.05); },
  war() { tone(90, 0, 0.5, 'sawtooth', 0.12); tone(70, 0.15, 0.6, 'sawtooth', 0.1); },
  key() { [660, 880, 1100].forEach((f, i) => tone(f, i * 0.09, 0.2, 'sine', 0.08)); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.15, 0.35, 'triangle', 0.1)); },
};
