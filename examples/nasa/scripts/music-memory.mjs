// "memory" / "memory-faded": an ORIGINAL slow 1930s ballroom piece heard as if from a worn 78 record in another
// room (the feel of The Caretaker's "Everywhere at the End of Time", which is copyrighted: nothing of it is used).
// A muted sax-like lead plays a hand-written 8-bar melody over sweet ballroom chords (I6, vi7, ii7, V7, a
// diminished passing chord), with soft piano on the off-beats, upright bass and brushed snare, ~72 bpm. Then it is
// aged: gramophone band-pass, wow and flutter, crackle and hiss, a long distant reverb, and the phrase loops like a
// memory. "memory-faded" is further gone: darker, more warble and crackle, wetter, with drop-outs.
// memory(seconds, seed, faded) -> Float32Array (mono, 48 kHz)

const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---- the piece (Eb major, 4/4): melody as [scale degree, beats] per bar; chords as semitones from the key
const KEY = 63, SCALE = [0, 2, 4, 5, 7, 9, 11];
const deg = (d) => KEY + SCALE[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const MELODY = [
  [[4, 2], [2, 1], [3, 1]],            // I6     Bb  G  Ab
  [[4, 3], [5, 1]],                    // vi7    Bb      C
  [[3, 2], [1, 1], [2, 1]],            // ii7    Ab  F  G
  [[1, 3], [4, 1]],                    // V7     F       Bb
  [[7, 2], [6, 1], [4, 1]],            // I6     Eb' D  Bb
  [[5, 2], [4, 2]],                    // #idim7 C   Bb
  [[3, 1], [2, 1], [1, 2]],            // ii7    Ab G  F
  [[2, 2], [0, 2]],                    // V7→I   G   Eb
];
const CHORDS = [[0, 4, 7, 9], [-3, 0, 4, 7], [-7, -4, 0, 3], [-2, 2, 5, 8], [0, 4, 7, 9], [1, 4, 7, 10], [-7, -4, 0, 3], [-2, 2, 5, 8]];
const ROOTS = [0, -3, -7, -2, 0, 1, -7, -2];

// ---- RBJ biquad, applied in place
function biquad(x, type, f, q = 0.707) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
}
// ---- Schroeder reverb (4 combs + 2 all-pass): the far-away hall
function reverb(x, decay, wet) {
  const out = new Float32Array(x.length), combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.round(d * SR / 25000), buf: new Float32Array(Math.round(d * SR / 25000)), i: 0, lp: 0 }));
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.lp = y * 0.7 + c.lp * 0.3; c.buf[c.i] = x[n] + c.lp * decay; c.i = (c.i + 1) % c.d; s += y; }
    out[n] = s / 4;
  }
  for (const d of [Math.round(225 * SR / 25000), Math.round(556 * SR / 25000)]) {
    const buf = new Float32Array(d); let i = 0;
    for (let n = 0; n < out.length; n++) { const b = buf[i], y = -out[n] + b; buf[i] = out[n] + b * 0.5; i = (i + 1) % d; out[n] = y; }
  }
  for (let n = 0; n < x.length; n++) x[n] = x[n] * (1 - wet) + out[n] * wet * 1.6;
}

export function memory(seconds, seed = 1, faded = false) {
  const n = Math.ceil(seconds * SR), dry = new Float32Array(n), r = rng(seed * 104729 + (faded ? 7 : 3));
  const bpm = faded ? 66 : 72, beat = 60 / bpm, bar = beat * 4;
  const add = (t0, dur, f, amp, kind) => {
    const i0 = Math.floor(t0 * SR), len = Math.floor((dur + (kind === "piano" ? 1.2 : 0.25)) * SR);
    for (let i = 0; i < len && i0 + i < n; i++) {
      const t = i / SR;
      let v = 0;
      if (kind === "sax") {           // muted reed: odd-ish harmonics, slow attack, warm vibrato after the attack
        const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.35), ph = 2 * Math.PI * f * vib * t;
        v = Math.sin(ph) * 0.55 + Math.sin(2 * ph) * 0.22 + Math.sin(3 * ph) * 0.16 + Math.sin(4 * ph) * 0.06 + Math.sin(5 * ph) * 0.05;
        v *= Math.min(1, t / 0.09) * Math.max(0, Math.min(1, (dur - t) / 0.2 + 0.2));
      } else if (kind === "piano") {  // soft felt piano: bright onset, quick then long decay
        const ph = 2 * Math.PI * f * t;
        v = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) * Math.exp(-t * 4) + 0.15 * Math.sin(3 * ph) * Math.exp(-t * 7)) * Math.exp(-t * 2.2) * Math.min(1, t / 0.004);
      } else if (kind === "strings") { // a quiet string section holding the chord
        const ph = 2 * Math.PI * f * t;
        v = (Math.sin(ph) + Math.sin(ph * 1.004) + 0.3 * Math.sin(2 * ph * 0.998)) * 0.4 * Math.min(1, t / 0.6) * Math.max(0, Math.min(1, (dur - t) / 0.6 + 0.1));
      } else if (kind === "bass") {   // upright bass pluck
        const ph = 2 * Math.PI * f * t;
        v = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.exp(-t * 3.5) * Math.min(1, t / 0.006);
      }
      dry[i0 + i] += v * amp;
    }
  };
  const brush = (t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.18 && i0 + i < n; i++) dry[i0 + i] += (r() * 2 - 1) * amp * Math.exp(-i / SR * 18); };

  // the band, bar by bar; the 8-bar phrase repeats (a memory replaying), with small human differences each time
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % 8, ch = CHORDS[k];
    let at = t;
    for (const [d, beats] of MELODY[k]) {
      const late = (r() - 0.5) * 0.03; // a little rubato
      add(at + late, beats * beat * 0.95, hz(deg(d)), 0.16, "sax");
      at += beats * beat;
    }
    for (const s of ch) add(t, bar, hz(KEY - 12 + s), 0.035, "strings");
    for (const q of [1, 3]) for (const s of ch) add(t + q * beat + (r() - 0.5) * 0.01, beat * 0.6, hz(KEY - 12 + s), 0.028, "piano");
    add(t, beat * 1.6, hz(KEY - 24 + ROOTS[k]), 0.2, "bass"); add(t + 2 * beat, beat * 1.6, hz(KEY - 24 + ROOTS[k] + 7), 0.16, "bass");
    for (const q of [1, 3]) brush(t + q * beat, 0.025);
  }

  // ---- age it: wow and flutter (a warped record), gramophone band-pass, a far-away hall, crackle and hiss
  const out = new Float32Array(n), wow = faded ? 0.0045 : 0.0025;
  for (let i = 0; i < n; i++) {
    const t = i / SR, d = (wow * Math.sin(2 * Math.PI * 0.55 * t) + 0.0004 * Math.sin(2 * Math.PI * 6.3 * t)) * SR + 400;
    const p = i - d, i0 = Math.floor(p), f = p - i0;
    out[i] = i0 >= 0 && i0 + 1 < n ? dry[i0] * (1 - f) + dry[i0 + 1] * f : 0;
  }
  // in the order a real recording ages: the band in a far-away hall, pressed onto a record (crackle, hiss), played
  // through a gramophone that passes only the middle of the spectrum (so neither rumble nor reverb bass survives)
  reverb(out, faded ? 0.86 : 0.8, faded ? 0.55 : 0.4);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const noise = rng(seed * 31 + 5); let pop = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = out[i] / (peak || 1) * 0.8;
    if (noise() < (faded ? 0.0009 : 0.0005)) pop = (noise() * 2 - 1) * (0.12 + noise() * 0.25); // crackle
    pop *= 0.7;
    v += (noise() * 2 - 1) * (faded ? 0.035 : 0.02) + pop;                  // surface hiss
    if (faded) v *= 0.72 + 0.28 * Math.max(0, Math.sin(2 * Math.PI * t / 11 + seed)) ** 0.3; // the memory drops away now and then
    out[i] = v;
  }
  const lo = faded ? 260 : 200, hi = faded ? 2400 : 3600;
  for (let k = 0; k < 2; k++) { biquad(out, "hp", lo); biquad(out, "lp", hi); }
  // level from the music (a crackle must not set it), with a soft limit for the odd loud pop
  let sum = 0; for (let i = 0; i < n; i++) sum += out[i] * out[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 1.5;
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return out;
}
