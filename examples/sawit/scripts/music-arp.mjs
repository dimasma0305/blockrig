// "quirky-arp": an ORIGINAL bouncy broken-chord loop with an awkward, quirky colour, at 94 bpm, tuned sharp (A4 =
// 451 Hz). What it borrows is only what nobody owns: a tempo, a tuning, a chord progression (Db, Db6/Bbm, Bbm, and an
// augmented A-Db-F twist whose A natural against Db and F gives the awkward tension) and a texture (staccato piano +
// detuned synth arpeggios). The arpeggio's note order and the little top line are our own; a song's riff or melody
// (even transcribed note by note) is never copied.
// quirkyArp(seconds, seed) -> Float32Array (mono, 48 kHz)
import { pianoNote } from "./music-piano.mjs";

const SR = 48000, A4 = 451;
const hz = (m) => A4 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// chords as MIDI (around Db4); low = the bass note
const CHORDS = [
  { tones: [61, 65, 68], low: 37 },        // Db       Db F Ab
  { tones: [61, 65, 70], low: 34 },        // Db6/Bbm  Db F Bb
  { tones: [58, 61, 65], low: 34 },        // Bbm      Bb Db F
  { tones: [57, 61, 65], low: 33 },        // aug      A Db F   (the awkward one)
];
// our own arpeggio shape (indexes into [5th below, root, 3rd, 5th, octave]): a bouncing wave, not a straight climb
const SHAPE = [1, 2, 0, 3, 2, 4, 3, 2];
// a sparse, hesitant top line of our own (MIDI, eighth-note position in the bar); null bars rest
const TOP = [[[77, 3], [75, 4]], [[77, 3], [80, 6]], [[77, 3], [73, 4]], [[76, 2], [73, 5], [72, 6]]];

const pulse = (ph, duty) => ((ph % 1) < duty ? 1 : -1);
function synth(out, t0, f, dur, amp) {     // detuned retro synth (+-10 cents), short and bouncy
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.05) * SR), d = 2 ** (10 / 1200); let p1 = 0, p2 = 0, lp = 0;
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR; p1 += f * d / SR; p2 += f / d / SR;
    const raw = pulse(p1, 0.3) * 0.5 + (2 * (p2 % 1) - 1) * 0.5, a = Math.exp(-2 * Math.PI * (900 + 3000 * Math.exp(-t * 18)) / SR);
    lp = (1 - a) * raw + a * lp; out[i0 + i] += lp * Math.min(1, t / 0.003) * (t < dur ? Math.exp(-t * 6) : Math.exp(-(t - dur) * 45)) * amp;
  }
}
function bass(out, t0, f, dur, amp) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < (dur + 0.04) * SR && i0 + i < out.length; i++) { const t = i / SR, p = 2 * Math.PI * f * t; out[i0 + i] += (Math.sin(p) + 0.3 * Math.sin(2 * p)) * Math.min(1, t / 0.004) * (t < dur ? Math.exp(-t * 4) : Math.exp(-(t - dur) * 40)) * amp; }
}
const kick = (out, t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.2 && i0 + i < out.length; i++) { const t = i / SR; out[i0 + i] += Math.sin(2 * Math.PI * (48 + 80 * Math.exp(-t * 30)) * t) * Math.exp(-t * 14) * amp; } };
function noise(out, t0, amp, dur, decay, r) { const i0 = Math.floor(t0 * SR); let hp = 0, prev = 0; for (let i = 0; i < SR * dur && i0 + i < out.length; i++) { const n = r() * 2 - 1; hp = 0.7 * (hp + n - prev); prev = n; out[i0 + i] += hp * Math.exp(-i / SR * decay) * amp; } }

export function quirkyArp(seconds, seed = 1) {
  const n = Math.ceil(seconds * SR), out = new Float32Array(n), r = rng(seed * 1103515245 + 21);
  const bpm = 94, beat = 60 / bpm, bar = beat * 4, e8 = beat / 2;
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % 4, c = CHORDS[k], pool = [c.tones[2] - 12, c.tones[0], c.tones[1], c.tones[2], c.tones[0] + 12];
    // the arpeggio: staccato piano, doubled by the detuned synth an octave up
    SHAPE.forEach((s, e) => {
      const m = pool[s], at = t + e * e8 + (r() - 0.5) * 0.006;
      pianoNote(out, at, hz(m), e8 * 0.45, 0.55, r);
      synth(out, at, hz(m + 12), e8 * 0.4, 0.07);
    });
    // our own hesitant top line
    for (const [m, pos] of TOP[k]) synth(out, t + pos * e8, hz(m), e8 * 1.4, 0.12);
    // bass: root on 1, bounce on the "and" of 2, root on 3
    for (const q of [0, 1.5, 2]) bass(out, t + q * beat, hz(c.low + (q === 1.5 ? 12 : 0)), beat * 0.4, 0.3);
    // soft lo-fi beat
    kick(out, t, 0.42); kick(out, t + 2 * beat, 0.36);
    for (const q of [1, 3]) noise(out, t + q * beat, 0.22, 0.15, 26, r);
    for (let e = 0; e < 8; e++) noise(out, t + e * e8, e % 2 ? 0.04 : 0.06, 0.03, 140, r);
  }
  // small room, level, gentle limit, fades
  const y = Float32Array.from(out);
  for (const [d, g] of [[0.018, 0.16], [0.03, 0.12], [0.047, 0.08]]) { const k = Math.round(d * SR); for (let i = k; i < n; i++) y[i] += out[i - k] * g; }
  let sum = 0; for (let i = 0; i < n; i++) sum += y[i] * y[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 0.3;
  for (let i = 0; i < n; i++) y[i] = Math.tanh(y[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return y;
}
