// Seeded random numbers and easing for frame-pure video: the same seed always gives the same sequence, so a frame
// renders the same in whichever tab (or order) Remotion draws it. BlockRig extra (Roblox has no equivalent).

/** A seeded random number generator (LCG): `rng(seed)()` returns 0..1, the same sequence for the same seed. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Smoothstep on 0..1. */
export const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
/** Cubic ease in and out on 0..1. */
export const easeInOut = (x) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** Cubic ease out on 0..1. */
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a, b, t) => a + (b - a) * t;
