// Tiny music composer: original, synthesised background tracks for a mood (no samples, nothing to credit).
// compose(theme, seconds, seed) -> Float32Array (mono, 48 kHz); writeWav(path, samples)
import fs from "node:fs";
import { memory } from "./music-memory.mjs";
import { piano } from "./music-piano.mjs";

export const SR = 48000;
const THEMES = {
  mystery: { bpm: 92, key: 57, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], lead: "pluck", drums: "soft", swing: 0.12 },
  suspense: { bpm: 112, key: 52, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 5, 1], lead: "pulse", drums: "tense", swing: 0 },
  happy: { bpm: 124, key: 60, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], lead: "bell", drums: "bouncy", swing: 0.08 },
  cyber: { bpm: 118, key: 50, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 0, 5, 6], lead: "pulse", drums: "bouncy", swing: 0 },
  triumph: { bpm: 128, key: 62, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], lead: "bell", drums: "bouncy", swing: 0 },
  comedy: { bpm: 132, key: 62, scale: [0, 2, 4, 5, 7, 9, 10], prog: [0, 3, 4, 0], lead: "pluck", drums: "bouncy", swing: 0.22 },
  sad: { bpm: 76, key: 55, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], lead: "bell", drums: "soft", swing: 0 },
  action: { bpm: 140, key: 50, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 6, 5], lead: "pulse", drums: "tense", swing: 0 },
  chill: { bpm: 84, key: 58, scale: [0, 2, 4, 7, 9, 11, 14], prog: [0, 3, 5, 4], lead: "pluck", drums: "soft", swing: 0.18 },
};
/** The mood names docs/audio.md can use. */
// memory / memory-faded: a worn 1930s ballroom record far away (scripts/music-memory.mjs)
// goofy-piano / sneaky-piano: bouncy brainrot-style piano (scripts/music-piano.mjs)
export const THEME_NAMES = [...Object.keys(THEMES), "memory", "memory-faded", "goofy-piano", "sneaky-piano"];

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function compose(theme, seconds, seed = 1) {
  if (theme === "memory" || theme === "memory-faded") return memory(seconds, seed, theme === "memory-faded");
  if (theme === "goofy-piano" || theme === "sneaky-piano") return piano(seconds, seed, theme.split("-")[0]);
  const T = THEMES[theme]; if (!T) throw new Error(`unknown theme ${theme}`);
  const n = Math.ceil(seconds * SR), out = new Float32Array(n), r = rng(seed * 7919 + theme.length);
  const beat = 60 / T.bpm, bar = beat * 4;
  const note = (deg, oct = 0) => { const s = T.scale, d = ((deg % 7) + 7) % 7; return T.key + s[d] + 12 * (Math.floor(deg / 7) + oct); };
  const add = (t0, dur, f, amp, kind) => {
    const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
    for (let i = 0; i < len && i0 + i < n; i++) {
      const t = i / SR, ph = 2 * Math.PI * f * t;
      let v;
      if (kind === "pluck") v = Math.sin(ph) * 0.6 + Math.sin(2 * ph) * 0.25 + Math.sin(3 * ph) * 0.1;
      else if (kind === "pulse") v = (Math.sin(ph) > 0.2 ? 1 : -1) * 0.35;
      else if (kind === "bell") v = Math.sin(ph) * 0.6 + Math.sin(ph * 2.76) * 0.2 * Math.exp(-t * 6);
      else if (kind === "pad") v = Math.sin(ph) * 0.5 + Math.sin(ph * 1.005) * 0.5;
      else v = Math.sin(ph); // bass
      const a = Math.min(1, t / 0.008), d = kind === "pad" ? Math.min(1, (dur - t) / 0.3) : Math.exp(-t * (kind === "bass" ? 3 : 7));
      out[i0 + i] += v * amp * a * Math.max(0, d);
    }
  };
  const drum = (t0, type, amp) => {
    const i0 = Math.floor(t0 * SR), len = Math.floor((type === "kick" ? 0.25 : 0.12) * SR);
    for (let i = 0; i < len && i0 + i < n; i++) {
      const t = i / SR;
      const v = type === "kick" ? Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-t * 40)) * t) * Math.exp(-t * 12) : (r() * 2 - 1) * Math.exp(-t * (type === "hat" ? 60 : 22));
      out[i0 + i] += v * amp;
    }
  };
  for (let b = 0; b * bar < seconds; b++) {
    const t = b * bar, root = T.prog[b % T.prog.length];
    // pad chord + bass
    for (const k of [0, 2, 4]) add(t, bar, hz(note(root + k, -1)), 0.05, "pad");
    add(t, beat * 1.5, hz(note(root, -2)), 0.22, "bass"); add(t + beat * 2, beat * 1.5, hz(note(root, -2)), 0.18, "bass");
    // lead: eighth-note motif from chord tones with small steps, seeded
    let deg = root + 7;
    for (let e = 0; e < 8; e++) {
      if (r() < (T.lead === "pulse" ? 0.15 : 0.3)) continue;
      deg += [-2, -1, 0, 1, 2][Math.floor(r() * 5)];
      const st = t + e * beat / 2 + (e % 2 ? T.swing * beat : 0);
      add(st, beat * 0.45, hz(note(deg, 0)), T.lead === "pulse" ? 0.06 : 0.1, T.lead);
    }
    // drums
    for (let q = 0; q < 4; q++) {
      const st = t + q * beat;
      if (T.drums !== "soft" || q % 2 === 0) drum(st, "kick", T.drums === "tense" ? 0.35 : 0.45);
      if (q % 2 === 1 && T.drums !== "soft") drum(st, "snare", 0.18);
      drum(st + beat / 2, "hat", 0.06);
    }
  }
  // gentle fade in/out and normalise
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const fade = SR * 0.6;
  for (let i = 0; i < n; i++) { out[i] = (out[i] / (peak || 1)) * 0.85 * Math.min(1, i / fade, (n - i) / fade); }
  return out;
}

export function writeWav(path, x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(path, b);
}
