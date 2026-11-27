// 시드 기반 난수 (mulberry32). 상태에 시드를 저장해 재현·테스트가 가능하다.
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextSeed];
}

/** state.rngSeed를 갱신하며 [0,1) 난수를 꺼낸다 */
export function rand(s: { rngSeed: number }): number {
  const [v, n] = nextRandom(s.rngSeed);
  s.rngSeed = n;
  return v;
}

export function randInt(s: { rngSeed: number }, min: number, max: number): number {
  return min + Math.floor(rand(s) * (max - min + 1));
}

export function shuffle<T>(s: { rngSeed: number }, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
