// "goofy-piano" / "sneaky-piano": ORIGINAL bouncy piano pieces in the playful style of viral Roblox / brainrot
// shorts. A modelled piano (two detuned strings per note, stretched partials, brighter partials fading faster, a
// hammer thump, staccato notes damped), an oom-pah left hand (bass on 1 and 3, chord on 2 and 4), a simple
// repeating right-hand motif of 3-4 notes, soft kick and finger snaps, a small room.
//   goofy:  F major, ~132 bpm, F A C D over F and C7
//   sneaky: D minor, ~112 bpm, tiptoe staccato on D F A C# over Dm and A7
// piano(seconds, seed, style) -> Float32Array (mono, 48 kHz)

const SR = 48000;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Simple on purpose (the user: "too complex, maybe 3 or 4 notes"): a two-bar motif of 3-4 notes that repeats,
// over two chords. Catchy loops beat busy tunes in these videos.
// melody: [scale degree | null rest, beats] per bar
const STYLES = {
  goofy: {
    bpm: 132, key: 65, scale: [0, 2, 4, 5, 7, 9, 11],  // F major; the tune uses only F A C D (degrees 0 2 4 5)
    chords: [[0, 4, 7], [-5, -1, 2, 5]], roots: [0, -5], // F, C7, alternating every bar
    melody: [
      [[4, .5], [2, .5], [4, .5], [2, .5], [0, 1], [null, 1]],     // C A C A F
      [[4, .5], [2, .5], [4, .5], [5, .5], [4, 1], [null, 1]],     // C A C D C
      [[4, .5], [2, .5], [4, .5], [2, .5], [0, 1], [null, 1]],
      [[5, .5], [4, .5], [2, .5], [4, .5], [0, 1], [null, 1]],     // D C A C F
    ],
    staccato: 0.5, swing: 0.06,
  },
  sneaky: {
    bpm: 112, key: 62, scale: [0, 2, 3, 5, 7, 8, 11],  // D harmonic minor; the tune uses only D F A C# (0 2 4 -1)
    chords: [[0, 3, 7], [-5, -1, 2, 5]], roots: [0, -5], // Dm, A7
    melody: [
      [[0, .5], [null, .5], [2, .5], [null, .5], [4, .5], [null, .5], [2, .5], [null, .5]], // D . F . A . F .
      [[0, .5], [null, .5], [-1, .5], [null, .5], [0, 1], [null, 1]],                       // D . C# . D
      [[0, .5], [null, .5], [2, .5], [null, .5], [4, .5], [null, .5], [2, .5], [null, .5]],
      [[4, .5], [null, .5], [-1, .5], [null, .5], [0, 1], [null, 1]],                       // A . C# . D
    ],
    staccato: 0.35, swing: 0,
  },
};

// one piano note added into `out` (two strings, stretched partials, per-partial decay, hammer, damper)
function pianoNote(out, t0, f, held, vel, r) {
  const i0 = Math.floor(t0 * SR), ring = held + 0.12, len = Math.floor(Math.min(held + 1.4, 3) * SR), B = 0.00035;
  const parts = []; for (let k = 1; k <= 9; k++) {
    const fk = f * k * Math.sqrt(1 + B * k * k); if (fk > 9000) break;
    parts.push({ w: 2 * Math.PI * fk / SR, w2: 2 * Math.PI * fk * 1.0006 / SR, a: vel * (0.9 / k ** 1.1) * (k === 1 ? 1 : 0.6 + 0.4 * vel), d: (1.1 + 0.55 * k) * (f > 600 ? 1.6 : 1) });
  }
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR, damp = t < ring ? 1 : Math.exp(-(t - ring) * 28); // the damper after the key is released
    let v = 0;
    for (const p of parts) v += p.a * Math.exp(-p.d * t) * (Math.sin(p.w * i) + Math.sin(p.w2 * i)) * 0.5;
    if (t < 0.006) v += (r() * 2 - 1) * 0.25 * vel * (1 - t / 0.006); // hammer
    out[i0 + i] += v * damp * Math.min(1, t / 0.0015);
  }
}
const kick = (out, t0, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.18 && i0 + i < out.length; i++) { const t = i / SR; out[i0 + i] += Math.sin(2 * Math.PI * (48 + 70 * Math.exp(-t * 35)) * t) * Math.exp(-t * 16) * amp; } };
function snap(out, t0, amp, r) { // finger snap: a bright noise tick
  const i0 = Math.floor(t0 * SR); let hp = 0, prev = 0;
  for (let i = 0; i < SR * 0.06 && i0 + i < out.length; i++) { const n = r() * 2 - 1; hp = 0.85 * (hp + n - prev); prev = n; out[i0 + i] += hp * Math.exp(-i / SR * 70) * amp; }
}
function room(x) { // a small room: a few early reflections and a short tail
  const taps = [[0.013, 0.22], [0.021, 0.17], [0.034, 0.13], [0.047, 0.1], [0.071, 0.07]].map(([d, g]) => [Math.round(d * SR), g]);
  const y = Float32Array.from(x);
  for (const [d, g] of taps) for (let i = d; i < x.length; i++) y[i] += x[i - d] * g;
  return y;
}

export function piano(seconds, seed = 1, style = "goofy") {
  const S = STYLES[style]; if (!S) throw new Error(`unknown piano style ${style}`);
  const n = Math.ceil(seconds * SR), out = new Float32Array(n), r = rng(seed * 2654435761 + style.length);
  const beat = 60 / S.bpm, bar = beat * 4;
  const deg = (d) => S.key + S.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  for (let b = 0; b * bar < seconds + bar; b++) {
    const t = b * bar, k = b % S.melody.length, ch = S.chords[b % S.chords.length], root = S.roots[b % S.roots.length];
    // left hand: bass on 1 and 3 (root, then fifth), the chord on 2 and 4, short and bouncy
    pianoNote(out, t, hz(S.key - 24 + root), beat * 0.7, 0.75, r);
    pianoNote(out, t + 2 * beat, hz(S.key - 24 + root + 7), beat * 0.7, 0.65, r);
    for (const q of [1, 3]) for (const c of ch) pianoNote(out, t + q * beat + (r() - 0.5) * 0.006, hz(S.key - 12 + c), beat * 0.32, 0.38, r);
    // right hand: the tune (an octave up the second time round), staccato, a touch of swing on the off-beats
    let at = t;
    for (const [d, beats] of S.melody[k]) {
      if (d !== null) {
        const off = Math.abs((at - t) / beat % 1 - 0.5) < 1e-6 ? S.swing * beat : 0, m = deg(d);
        pianoNote(out, at + off, hz(m), beats * beat * (beats >= 1 ? 0.8 : S.staccato), 0.85 + r() * 0.1, r);
      }
      at += beats * beat;
    }
    // drums: soft kick on 1 and 3, snaps on 2 and 4
    kick(out, t, 0.5); kick(out, t + 2 * beat, 0.4);
    snap(out, t + beat, 0.35, r); snap(out, t + 3 * beat, 0.35, r);
  }
  const y = room(out);
  // level and a gentle limit; fade in and out
  let sum = 0; for (let i = 0; i < n; i++) sum += y[i] * y[i];
  const gain = 0.2 / Math.sqrt(sum / n || 1), fade = SR * 0.4;
  for (let i = 0; i < n; i++) y[i] = Math.tanh(y[i] * gain) * 0.95 * Math.min(1, i / fade, (n - i) / fade);
  return y;
}
