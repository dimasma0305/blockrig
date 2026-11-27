// "brainrot": an ORIGINAL earworm loop, built to be remembered and chanted back after one listen.
// - the hook is the playground chant everyone already knows how to sing (sol-mi-la-sol: G E A G), plus C to land:
//   four notes only, in a chant rhythm ("da-da DUM, da-da DUM"), repeated A A A B;
// - a "la-la" voice (formant synthesis) carries it so it feels sung, a bright bell doubles it an octave up;
// - the most familiar pop chords (C Am F G), a bouncy bass, four-on-the-floor kick, claps on 2 and 4, ticking hats.
// brainrot(seconds, seed) -> Float32Array (mono, 48 kHz)

const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const G = 67, E = 64, A = 69, C = 72; // the only four melody notes
const HOOK = [
  [[G, .5], [G, .5], [E, 1], [A, .5], [G, .5], [E, 1]],          // da-da DUM, da-da DUM
  [[G, .5], [G, .5], [E, 1], [A, .5], [G, .5], [E, 1]],
  [[G, .5], [G, .5], [E, .5], [E, .5], [A, .5], [A, .5], [G, 1]],
  [[E, .5], [G, .5], [A, .5], [G, .5], [C, 1], [null, 1]],        // ...and land
];
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]; // C Am F G
const BASS = [36, 33, 29, 31];

// a tiny two-pole resonator (band-pass) for vowel formants
function formant(x, f, q) {
  const w = 2 * Math.PI * f / SR, r = Math.exp(-w / (2 * q)), a1 = -2 * r * Math.cos(w), a2 = r * r, y = new Float32Array(x.length);
  for (let i = 2; i < x.length; i++) y[i] = (1 - r) * (x[i] - x[i - 2]) - a1 * y[i - 1] - a2 * y[i - 2];
  return y;
}
// one sung "la": a slightly vibrato'd sawtooth through "ah" formants, with an "l" onset (a quick dip in brightness)
function la(out, t0, f, dur, amp) {
  const len = Math.floor((dur + 0.08) * SR), src = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += f * (1 + 0.008 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.15)) / SR; src[i] = 2 * (ph % 1) - 1; }
  const f1 = formant(src, 750, 6), f2 = formant(src, 1150, 8), f3 = formant(src, 2600, 10);
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.025) * Math.max(0, Math.min(1, (dur - t) / 0.06 + 0.15)), open = Math.min(1, 0.35 + t / 0.05);
    out[i0 + i] += (f1[i] * 1.0 + f2[i] * 0.7 * open + f3[i] * 0.25 * open) * env * amp;
  }
}
function bell(out, t0, f, amp) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < SR * 0.6 && i0 + i < out.length; i++) { const t = i / SR, p = 2 * Math.PI * f * t; out[i0 + i] += (Math.sin(p) + 0.4 * Math.sin(p * 2.01) * Math.exp(-t * 8) + 0.2 * Math.sin(p * 3.99) * Math.exp(-t * 14)) * Math.exp(-t * 5) * Math.min(1, t / 0.002) * amp; }
}
function pluck(out, t0, f, dur, amp) { // the chords: a soft electric-piano pluck
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < (dur + 0.3) * SR && i0 + i < out.length; i++) { const t = i / SR, p = 2 * Math.PI * f * t; out[i0 + i] += (Math.sin(p) + 0.25 * Math.sin(2 * p)) * Math.exp(-t * 3.5) * Math.min(1, t / 0.003) * (t < dur ? 1 : Math.exp(-(t - dur) * 20)) * amp; }
}
function bass(out, t0, f, dur, amp) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < (dur + 0.05) * SR && i0 + i < out.length; i++) { const t = i / SR, p = 2 * Math.PI * f * t; out[i0 + i] += (Math.sin(p) + 0.3 * Math.sin(2 * p) + 0.12 * Math.sin(3 * p)) * Math.min(1, t / 0.004) * (t < dur ? Math.exp(-t * 2) : Math.exp(-(t - dur) * 40)) * amp; }
}
const kick = (out, t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.2 && i0 + i < out.length; i++) { const t = i / SR; out[i0 + i] += Math.sin(2 * Math.PI * (45 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 14) * amp; } };
function noiseHit(out, t0, amp, decay, bright, r) {
  const i0 = Math.floor(t0 * SR); let hp = 0, prev = 0;
  for (let i = 0; i < SR * 0.2 && i0 + i < out.length; i++) { const n = r() * 2 - 1; hp = bright * (hp + n - prev); prev = n; out[i0 + i] += hp * Math.exp(-i / SR * decay) * amp; }
}

export function brainrot(seconds, seed = 1) {
  const n = Math.ceil(seconds * SR), out = new Float32Array(n), r = rng(seed * 40503 + 11);
  const bpm = 120, beat = 60 / bpm, bar = beat * 4;
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % 4;
    // the hook: sung "la-la", doubled by a bell an octave up
    let at = t;
    for (const [m, beats] of HOOK[k]) {
      if (m !== null) { la(out, at, hz(m), beats * beat * 0.85, 1.0); bell(out, at, hz(m + 12), 0.22); } // the hook sits on top of the mix
      at += beats * beat;
    }
    // chords on the off-beats, a bouncy bass on 1, the "and" of 2, and 3
    for (const q of [0.5, 1.5, 2.5, 3.5]) for (const c of CHORDS[k]) pluck(out, t + q * beat, hz(c), beat * 0.3, 0.07);
    for (const q of [0, 1.5, 2]) bass(out, t + q * beat, hz(BASS[k] + 12), beat * 0.45, 0.24);
    // drums: four-on-the-floor, claps on 2 and 4, eighth-note hats
    for (let q = 0; q < 4; q++) kick(out, t + q * beat, 0.38);
    for (const q of [1, 3]) { noiseHit(out, t + q * beat, 0.35, 28, 0.6, r); noiseHit(out, t + q * beat + 0.012, 0.25, 30, 0.6, r); }
    for (let e = 0; e < 8; e++) noiseHit(out, t + e * beat / 2, e % 2 ? 0.07 : 0.1, 90, 0.95, r);
  }
  // a little room, level, gentle limit, fades
  const y = Float32Array.from(out);
  for (const [d, g] of [[0.017, 0.18], [0.029, 0.13], [0.043, 0.09]]) { const k = Math.round(d * SR); for (let i = k; i < n; i++) y[i] += out[i - k] * g; }
  let sum = 0; for (let i = 0; i < n; i++) sum += y[i] * y[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 0.3;
  for (let i = 0; i < n; i++) y[i] = Math.tanh(y[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return y;
}
