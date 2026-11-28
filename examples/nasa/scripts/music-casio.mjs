// "casio": an ORIGINAL quirky, awkward comedy loop to the user's brief: "instrumental only, lo-fi bedroom pop, cheap
// 90s Casio toy keyboard preset, bouncy staccato bassline, slightly detuned retro synth lead, quirky awkward comedy
// background loop, 120 bpm, no vocals".
// - toy keyboard: narrow pulse-wave organ stabs and a toy rhythm box, crushed to few bits and a low sample rate;
// - bass: short plucky eighths bouncing root, octave, fifth, with chromatic walk-ups;
// - lead: two square/saw oscillators detuned +-12 cents with a light vibrato; a melody with hesitations, one
//   awkward note and a chromatic "wah-wah" slide down;
// - chords flip between major and minor (C E7 F Fm); slight tape wobble, rolled-off highs, faint hiss; 4-bar loop.
// casio(seconds, seed) -> Float32Array (mono, 48 kHz)

const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const MELODY = [ // MIDI, beats (null = rest)
  [[67, .5], [64, .5], [null, .5], [67, .25], [67, .25], [72, .5], [null, .5], [71, .5], [null, .5]], // C:   G E . GG C' . B .
  [[68, .5], [null, .5], [71, .5], [68, .5], [64, 1], [null, 1]],                                      // E7:  G# . B G# E      (the awkward note)
  [[69, .5], [72, .5], [null, .5], [69, .5], [65, .5], [67, .5], [69, 1]],                             // F:   A C' . A F G A
  [[68, .5], [67, .5], [66, .5], [65, .5], [64, 1], [null, 1]],                                        // Fm:  Ab G F# F E      (wah-wah slide)
];
const CHORDS = [[60, 64, 67], [59, 64, 68], [60, 65, 69], [60, 65, 68]]; // C, E7 (no 7th, inverted), F, Fm
const BASS = [                                                            // eighth notes; null = rest
  [36, null, 48, 36, null, 43, 48, 38],   // C:  root . oct root . 5th oct (walk up)
  [40, null, 52, 40, null, 47, 52, 39],   // E7
  [41, null, 53, 41, null, 48, 53, 42],   // F
  [41, null, 53, 41, 44, 43, 42, 35],     // Fm: chromatic slide down to the B below C
];

// cheap keyboard: few bits, low sample rate (sample-and-hold), applied to a whole bus
function crush(x, bits, rate) {
  const step = 2 / 2 ** bits, hold = Math.max(1, Math.round(SR / rate)); let v = 0;
  for (let i = 0; i < x.length; i++) { if (i % hold === 0) v = Math.round(x[i] / step) * step; x[i] = v; }
}
function onePoleLP(x, f) { const a = Math.exp(-2 * Math.PI * f / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } }

const pulse = (ph, duty) => ((ph % 1) < duty ? 1 : -1);
const saw = (ph) => 2 * (ph % 1) - 1;
function toyOrgan(out, t0, f, dur, amp) {               // Casio "organ/toy" preset: 12.5% pulse + octave, gated
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.02) * SR);
  for (let i = 0; i < len && i0 + i < out.length; i++) { const t = i / SR, ph = f * t; out[i0 + i] += (pulse(ph, 0.125) * 0.6 + pulse(ph * 2, 0.25) * 0.25) * (t < dur ? 1 : 0) * Math.min(1, t / 0.002) * Math.exp(-t * 3) * amp; }
}
function lead(out, t0, f, dur, amp) {                   // two detuned oscillators (+-12 cents), light vibrato
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.06) * SR), d = 2 ** (12 / 1200);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR, vib = 1 + 0.004 * Math.sin(2 * Math.PI * 6 * t) * Math.min(1, t / 0.2);
    p1 += f * d * vib / SR; p2 += f / d * vib / SR;
    const v = pulse(p1, 0.5) * 0.5 + saw(p2) * 0.5, env = Math.min(1, t / 0.006) * (t < dur ? 1 : Math.exp(-(t - dur) * 40));
    out[i0 + i] += v * env * amp;
  }
}
function bassPluck(out, t0, f, amp) {                   // staccato, bouncy: a short plucky square with a fast filter drop
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.14 * SR); let lp = 0;
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR, raw = pulse(f * t, 0.4), a = Math.exp(-2 * Math.PI * (300 + 2500 * Math.exp(-t * 30)) / SR);
    lp = (1 - a) * raw + a * lp; out[i0 + i] += lp * Math.exp(-t * 14) * Math.min(1, t / 0.002) * amp;
  }
}
// toy rhythm box
const kick = (out, t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.12 && i0 + i < out.length; i++) { const t = i / SR; out[i0 + i] += Math.sin(2 * Math.PI * (60 + 140 * Math.exp(-t * 40)) * t) * Math.exp(-t * 25) * amp; } };
function noise(out, t0, amp, dur, decay, r) { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * dur && i0 + i < out.length; i++) out[i0 + i] += (r() * 2 - 1) * Math.exp(-i / SR * decay) * amp; }

export function casio(seconds, seed = 1) {
  const n = Math.ceil(seconds * SR), r = rng(seed * 69069 + 17);
  const toy = new Float32Array(n), ld = new Float32Array(n), bs = new Float32Array(n);
  const bpm = 120, beat = 60 / bpm, bar = beat * 4;
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % 4;
    // lead melody
    let at = t;
    for (const [m, beats] of MELODY[k]) { if (m !== null) lead(ld, at, hz(m), beats * beat * 0.75, 0.32); at += beats * beat; }
    // toy organ stabs on the off-beats (oom-PAH)
    for (let e = 1; e < 8; e += 2) for (const c of CHORDS[k]) toyOrgan(toy, t + e * beat / 2, hz(c), beat * 0.22, 0.09);
    // bouncy staccato bass
    BASS[k].forEach((m, e) => { if (m !== null) bassPluck(bs, t + e * beat / 2, hz(m), 0.5); });
    // toy rhythm box: kick 1 and 3, snare 2 and 4, ticking hats
    kick(toy, t, 0.55); kick(toy, t + 2 * beat, 0.5);
    for (const q of [1, 3]) noise(toy, t + q * beat, 0.32, 0.12, 30, r);
    for (let e = 0; e < 8; e++) noise(toy, t + e * beat / 2, 0.07, 0.03, 160, r);
  }
  crush(toy, 6, 11025); onePoleLP(toy, 5000);           // the cheap keyboard (keys and rhythm box)
  crush(ld, 8, 22050);                                  // the lead a little less crushed, so the tune stays clear
  const mix = new Float32Array(n);
  for (let i = 0; i < n; i++) mix[i] = ld[i] * 1.35 + toy[i] * 1.0 + bs[i] * 0.8;
  // lo-fi: slight tape wobble, rolled-off highs, faint hiss
  const y = new Float32Array(n), h = rng(seed + 99);
  for (let i = 0; i < n; i++) {
    const d = (0.0012 * Math.sin(2 * Math.PI * 0.4 * i / SR) + 0.0003 * Math.sin(2 * Math.PI * 5 * i / SR)) * SR + 80, p = i - d, k = Math.floor(p), f = p - k;
    y[i] = (k >= 0 && k + 1 < n ? mix[k] * (1 - f) + mix[k + 1] * f : 0) + (h() * 2 - 1) * 0.004;
  }
  onePoleLP(y, 7000);
  let sum = 0; for (let i = 0; i < n; i++) sum += y[i] * y[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 0.25;
  for (let i = 0; i < n; i++) y[i] = Math.tanh(y[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return y;
}
