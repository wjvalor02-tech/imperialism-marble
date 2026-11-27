// 외부 파일 없이 Web Audio로 만든 짧은 효과음
import { useGame } from '../store/gameStore';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (useGame.getState().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
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
  coin() { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.08, 0.18, 'square', 0.05); },
  war() { tone(90, 0, 0.5, 'sawtooth', 0.12); tone(70, 0.15, 0.6, 'sawtooth', 0.1); },
  key() { [660, 880, 1100].forEach((f, i) => tone(f, i * 0.09, 0.2, 'sine', 0.08)); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.15, 0.35, 'triangle', 0.1)); },
};
