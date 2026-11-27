// Seeded random numbers: the same seed always gives the same sequence, so every frame renders the same.
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const easeInOut = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
