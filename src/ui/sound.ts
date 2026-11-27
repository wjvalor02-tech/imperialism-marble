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
  dice() { for (let i = 0; i < 7; i++) tone(180 + Math.random() * 220, i * 0.11, 0.06, 'square', 0.05); },
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
