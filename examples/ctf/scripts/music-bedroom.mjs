// "bedroom": an ORIGINAL laid-back bedroom-pop melody loop (instrumental), the kind of dreamy guitar loop popular
// under Roblox stories. Its melody is our own: songs people ask for ("Numbers" by TEMPOREX, etc.) are copyrighted,
// melody included, so never recreate one. A two-bar guitar melody looped over Fmaj7 Em7 Dm7 Cmaj7, clean chorus-y
// electric guitar (Karplus-Strong + chorus), soft strummed chords, round bass, lazy lo-fi drums, ~88 bpm.
// bedroom(seconds, seed) -> Float32Array (mono, 48 kHz)

const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// MIDI notes: the melody is two bars, played twice per four-bar chord cycle (a loop you can hum)
const MELODY = [
  [[76, .5], [74, .5], [72, .5], [69, 1], [null, .5], [67, .5], [69, .5]],   // E D C A . G A
  [[72, 1.5], [null, .5], [74, .5], [72, .5], [69, 1]],                       // C .  D C A
];
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
const BASS = [41, 40, 38, 36];

// a plucked guitar string (Karplus-Strong), slightly bright, with a soft pick
function pluck(out, t0, f, dur, amp, r, bright = 0.5) {
  const i0 = Math.floor(t0 * SR), N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N);
  let lp = 0; for (let i = 0; i < N; i++) { lp = lp * 0.6 + (r() * 2 - 1) * 0.4; buf[i] = lp; }
  let p = 0; const len = Math.floor((dur + 0.15) * SR), loss = 0.996 + bright * 0.0035;
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const a = buf[p], b = buf[(p + 1) % N]; buf[p] = (a * (0.5 + bright * 0.2) + b * (0.5 - bright * 0.2)) * loss; p = (p + 1) % N;
    const t = i / SR, damp = t < dur ? 1 : Math.exp(-(t - dur) * 25);
    out[i0 + i] += a * amp * damp;
  }
}
// chorus: two slowly moving delayed copies (the dreamy shimmer of a clean guitar pedal)
function chorus(x, depth = 0.003, mix = 0.5) {
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let s = x[i];
    for (const [rate, base, ph] of [[0.6, 0.012, 0], [0.43, 0.017, 2]]) {
      const d = (base + depth * Math.sin(2 * Math.PI * rate * i / SR + ph)) * SR, p = i - d, k = Math.floor(p), f = p - k;
      if (k >= 0 && k + 1 < x.length) s += mix * (x[k] * (1 - f) + x[k + 1] * f);
    }
    y[i] = s / (1 + mix);
  }
  return y;
}
function bass(out, t0, f, dur, amp) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < (dur + 0.06) * SR && i0 + i < out.length; i++) { const t = i / SR, p = 2 * Math.PI * f * t; out[i0 + i] += (Math.sin(p) + 0.25 * Math.sin(2 * p)) * Math.min(1, t / 0.006) * (t < dur ? Math.exp(-t * 1.8) : Math.exp(-(t - dur) * 30)) * amp; }
}
const kick = (out, t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.25 && i0 + i < out.length; i++) { const t = i / SR; out[i0 + i] += Math.sin(2 * Math.PI * (44 + 55 * Math.exp(-t * 26)) * t) * Math.exp(-t * 10) * amp; } };
function noiseHit(out, t0, amp, decay, bright, r) {
  const i0 = Math.floor(t0 * SR); let hp = 0, prev = 0, lp = 0;
  for (let i = 0; i < SR * 0.25 && i0 + i < out.length; i++) { const n = r() * 2 - 1; hp = bright * (hp + n - prev); prev = n; lp = lp * 0.45 + hp * 0.55; out[i0 + i] += lp * Math.exp(-i / SR * decay) * amp; }
}

export function bedroom(seconds, seed = 1) {
  const n = Math.ceil(seconds * SR), r = rng(seed * 374761393 + 9);
  const lead = new Float32Array(n), keys = new Float32Array(n), rhythm = new Float32Array(n);
  const bpm = 88, beat = 60 / bpm, bar = beat * 4, swing = 0.08 * beat;
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % 4;
    // melody: the two-bar phrase, looped
    let at = t;
    for (const [m, beats] of MELODY[b % 2]) {
      if (m !== null) { const off = Math.abs((at - t) / beat % 1 - 0.5) < 1e-6 ? swing : 0; pluck(lead, at + off, hz(m), beats * beat * 0.95, 0.55, r, 0.6); }
      at += beats * beat;
    }
    // chords: a soft strum (low to high, a few ms apart) on 1 and on the "and" of 2
    for (const q of [0, 1.5]) CHORDS[k].forEach((c, j) => pluck(keys, t + q * beat + j * 0.018 + (q ? swing : 0), hz(c), beat * (q ? 2.2 : 1.4), 0.16, r, 0.35));
    bass(rhythm, t, hz(BASS[k]), beat * 1.4, 0.32); bass(rhythm, t + 2.5 * beat + swing, hz(BASS[k] + 7), beat * 1.2, 0.24);
    // lazy drums: kick on 1 and the "and" of 3, a rim/snare on 2 and 4, soft swung hats
    kick(rhythm, t, 0.4); kick(rhythm, t + 2.5 * beat + swing, 0.3);
    for (const q of [1, 3]) noiseHit(rhythm, t + q * beat, 0.2, 24, 0.5, r);
    for (let e = 0; e < 8; e++) noiseHit(rhythm, t + e * beat / 2 + (e % 2 ? swing : 0), e % 2 ? 0.04 : 0.065, 85, 0.95, r);
  }
  const g = chorus(lead, 0.003, 0.55), c = chorus(keys, 0.0025, 0.45), y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = g[i] * 2.6 + c[i] * 0.9 + rhythm[i] * 0.6; // the melody loop on top
  // a small warm room, level, gentle limit, fades
  const w = Float32Array.from(y);
  for (const [d, gg] of [[0.021, 0.18], [0.034, 0.13], [0.052, 0.09], [0.079, 0.06]]) { const k = Math.round(d * SR); for (let i = k; i < n; i++) w[i] += y[i - k] * gg; }
  let sum = 0; for (let i = 0; i < n; i++) sum += w[i] * w[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 0.5;
  for (let i = 0; i < n; i++) w[i] = Math.tanh(w[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return w;
}
