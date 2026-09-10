export function visitSeed() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

export function shuffleItems<T>(items: T[], seed: number): T[] {
  const next = [...items];
  let t = (seed || 1) >>> 0;
  const rand = () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
