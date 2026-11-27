// "story": an ORIGINAL melodic piece that is neither happy nor sad: curious, thoughtful, moving forward, for
// narration. D Dorian (minor with a brighter sixth: the in-between colour), a singable 8-bar tune that develops one
// motif and ends open on the fifth so it keeps going, over Dm7 G | Dm7 G | Fmaj7 C | G Dm7. A warm marimba lead
// softly doubled by the modelled piano, sustained piano chords and a soft pad, round bass, laid-back lo-fi beat, ~96 bpm.
// story(seconds, seed) -> Float32Array (mono, 48 kHz)
import { pianoNote } from "./music-piano.mjs";

const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const KEY = 62, DORIAN = [0, 2, 3, 5, 7, 9, 10];                     // D Dorian: D E F G A B C
const deg = (d) => KEY + DORIAN[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const MELODY = [                                                     // [degree | null, beats] per bar
  [[4, .5], [6, .5], [7, 1], [6, .5], [4, .5], [3, 1]],              // Dm7  A C D' C A G   (the motif)
  [[5, .5], [4, .5], [3, 1], [1, 1], [null, 1]],                     // G    B A G E        (its answer)
  [[4, .5], [6, .5], [7, 1], [8, .5], [7, .5], [6, 1]],              // Dm7  A C D' E' D' C (the motif, reaching higher)
  [[5, 1.5], [4, .5], [3, 2]],                                       // G    B . A G
  [[4, .5], [6, .5], [9, 1], [8, .5], [7, .5], [6, 1]],              // Fmaj7 A C F' E' D' C (higher still)
  [[8, .5], [7, .5], [6, 1], [3, 1], [null, 1]],                     // C    E' D' C G
  [[5, .5], [6, .5], [7, 1], [5, 1], [4, 1]],                        // G    B C D' B A
  [[4, 2], [null, 2]],                                               // Dm7  A ...          (open, on the fifth)
];
const CHORDS = [[0, 3, 7, 10], [5, 9, 12, 14], [0, 3, 7, 10], [5, 9, 12, 14], [3, 7, 10, 14], [-2, 2, 5, 9], [5, 9, 12, 14], [0, 3, 7, 10]];
const BASS = [0, 5, 0, 5, 3, -2, 5, 0];                              // D G D G F C G D (semitones from D)

function marimba(out, t0, f, amp) {                                  // a struck wooden bar: fundamental + the 4th partial
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < SR * 1.2 && i0 + i < out.length; i++) {
    const t = i / SR, p = 2 * Math.PI * f * t;
    out[i0 + i] += (Math.sin(p) * Math.exp(-t * 3.2) + 0.35 * Math.sin(p * 3.93) * Math.exp(-t * 11) + 0.12 * Math.sin(p * 9.2) * Math.exp(-t * 30)) * Math.min(1, t / 0.0015) * amp;
  }
}
function pad(out, t0, dur, f, amp) {                                 // soft detuned pad holding the chord
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.4) * SR);
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR, p = 2 * Math.PI * f * t;
    out[i0 + i] += (Math.sin(p) + Math.sin(p * 1.003) + 0.25 * Math.sin(2 * p * 0.998)) * Math.min(1, t / 0.4) * Math.max(0, Math.min(1, (dur + 0.4 - t) / 0.5)) * amp;
  }
}
function bass(out, t0, f, dur, amp) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < (dur + 0.08) * SR && i0 + i < out.length; i++) { const t = i / SR, p = 2 * Math.PI * f * t; out[i0 + i] += (Math.sin(p) + 0.2 * Math.sin(2 * p)) * Math.min(1, t / 0.005) * (t < dur ? Math.exp(-t * 1.5) : Math.exp(-(t - dur) * 30)) * amp; }
}
const kick = (out, t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.25 && i0 + i < out.length; i++) { const t = i / SR; out[i0 + i] += Math.sin(2 * Math.PI * (45 + 60 * Math.exp(-t * 28)) * t) * Math.exp(-t * 11) * amp; } };
function noiseHit(out, t0, amp, decay, bright, r) {
  const i0 = Math.floor(t0 * SR); let hp = 0, prev = 0, lp = 0;
  for (let i = 0; i < SR * 0.25 && i0 + i < out.length; i++) { const n = r() * 2 - 1; hp = bright * (hp + n - prev); prev = n; lp = lp * 0.5 + hp * 0.5; out[i0 + i] += lp * Math.exp(-i / SR * decay) * amp; }
}

export function story(seconds, seed = 1) {
  const n = Math.ceil(seconds * SR), out = new Float32Array(n), r = rng(seed * 2246822519 + 3);
  const bpm = 96, beat = 60 / bpm, bar = beat * 4, swing = 0.1 * beat;
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % 8;
    // the tune: marimba, softly doubled by piano
    let at = t;
    for (const [d, beats] of MELODY[k]) {
      if (d !== null) {
        const off = Math.abs((at - t) / beat % 1 - 0.5) < 1e-6 ? swing : 0, m = deg(d);
        marimba(out, at + off, hz(m), 0.42); pianoNote(out, at + off, hz(m), beats * beat * 0.9, 0.35, r);
      }
      at += beats * beat;
    }
    // harmony: piano chord on 1 and 3, a pad underneath, bass on 1 (root) and 3 (fifth)
    for (const q of [0, 2]) for (const c of CHORDS[k]) pianoNote(out, t + q * beat + (r() - 0.5) * 0.01, hz(KEY - 12 + c), beat * 1.8, 0.22, r);
    for (const c of CHORDS[k]) pad(out, t, bar, hz(KEY - 12 + c), 0.018);
    bass(out, t, hz(KEY - 24 + BASS[k]), beat * 1.7, 0.3); bass(out, t + 2 * beat, hz(KEY - 24 + BASS[k] + 7), beat * 1.7, 0.24);
    // laid-back beat: kick on 1 and the "and" of 3, soft snare on 2 and 4, swung hats
    kick(out, t, 0.42); kick(out, t + 2.5 * beat + swing, 0.32);
    for (const q of [1, 3]) noiseHit(out, t + q * beat, 0.22, 20, 0.55, r);
    for (let e = 0; e < 8; e++) noiseHit(out, t + e * beat / 2 + (e % 2 ? swing : 0), e % 2 ? 0.05 : 0.08, 80, 0.95, r);
  }
  // a warm room, level, gentle limit, fades
  const y = Float32Array.from(out);
  for (const [d, g] of [[0.019, 0.2], [0.031, 0.15], [0.047, 0.11], [0.071, 0.08], [0.103, 0.05]]) { const k = Math.round(d * SR); for (let i = k; i < n; i++) y[i] += out[i - k] * g; }
  let sum = 0; for (let i = 0; i < n; i++) sum += y[i] * y[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 0.5;
  for (let i = 0; i < n; i++) y[i] = Math.tanh(y[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return y;
}
