// Audio maths on mono Float32 PCM (-1..1), no dependencies: pitch, where the speech is, and real pauses at
// punctuation. Fixes from the logs:
//   - "sad sounds like another voice": every take's median pitch is measured (YIN) and kept near the narrator's
//     (the scripts' YIN read every voice ~7% low: fixed here);
//   - "the speech is too fast / long gaps": TTS pads both ends of a clip, so clips are trimmed to their speech;
//   - "commas must be heard": every comma gets at least 0.22 s and every inner stop / "..." 0.4 s of real silence;
//   - "a glitch at pauses" (one split "Sawit" in two): a pause is only ever cut into real silence, with 6 ms fades.

/**
 * Median voiced pitch (Hz) by YIN (de Cheveigné & Kawahara 2002): 40 ms frames, 70-400 Hz, the cumulative-mean-
 * normalised difference's first dip under 0.15 (robust to the octave errors plain autocorrelation makes). 0 if silent.
 */
export function medianPitch(x, sr = 16000, { minHz = 70, maxHz = 400, threshold = 0.15 } = {}) {
  const n = Math.round(0.04 * sr), hop = n >> 1, minL = Math.floor(sr / maxHz), maxL = Math.ceil(sr / minHz), out = [], d = new Float32Array(maxL + 1);
  for (let s = 0; s + n + maxL < x.length; s += hop) {
    let e = 0; for (let i = 0; i < n; i++) e += x[s + i] * x[s + i];
    if (e / n < 1e-4) continue;
    for (let L = 1; L <= maxL; L++) { let v = 0; for (let i = 0; i < n; i++) { const t = x[s + i] - x[s + i + L]; v += t * t; } d[L] = v; }
    let run = 0, lag = 0;
    for (let L = 1; L <= maxL; L++) {
      run += d[L]; const cm = (d[L] * L) / (run || 1);
      if (L >= minL && cm < threshold) {
        // walk down to the bottom of this dip (each step compared with the last one, not with the first crossing:
        // the scripts compared with the first, walked past the dip and read every voice ~7% low)
        let best = cm;
        while (L + 1 <= maxL) { const next = (d[L + 1] * (L + 1)) / (run + d[L + 1]); if (next >= best) break; best = next; L++; run += d[L]; }
        lag = L; break;
      }
    }
    if (lag) out.push(sr / lag);
  }
  out.sort((a, b) => a - b);
  return out.length ? out[out.length >> 1] : 0;
}

const rmsAt = (x, i, hop) => { let e = 0, n = 0; for (let k = Math.max(0, i); k < Math.min(x.length, i + hop); k++, n++) e += x[k] * x[k]; return Math.sqrt(e / (n || 1)); };
const peakOf = (x) => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };

/**
 * Where the speech is: `{ from, to }` in seconds, with `pad` kept before and `tail` after. Quiet = below `quiet` of
 * the peak (default 3%, about -30 dB), in 10 ms windows. Pauses inside the line are kept.
 */
export function speechBounds(x, sr, { quiet = 0.03, pad = 0.03, tail = 0.06 } = {}) {
  const hop = Math.round(0.01 * sr), q = quiet * peakOf(x), dur = x.length / sr;
  let a = 0; while (a < x.length && rmsAt(x, a, hop) < q) a += hop;
  let b = x.length - hop; while (b > a && rmsAt(x, b, hop) < q) b -= hop;
  if (a >= x.length) return { from: 0, to: dur };
  return { from: Math.max(0, a / sr - pad), to: Math.min(dur, (b + hop) / sr + tail) };
}
/** Trim a clip to its speech and move the word times with it: `{ x, from, to, duration, words }`. */
export function trimToSpeech(x, sr, words = [], o) {
  const { from, to } = speechBounds(x, sr, o);
  const y = x.slice(Math.round(from * sr), Math.round(to * sr));
  return { x: y, from, to, duration: +(y.length / sr).toFixed(3), words: words.map((w) => ({ ...w, start: Math.max(0, +(w.start - from).toFixed(3)), end: Math.max(0, +(w.end - from).toFixed(3)) })) };
}

/** The pause a word asks for after it: a stop, "!" "?" or "..." -> stopPause; a comma, colon, semicolon or dash -> commaPause. */
export function pauseAfter(word, { commaPause = 0.22, stopPause = 0.4 } = {}) {
  if (/(\.\.\.|…|[.!?])["')\]]*$/.test(word)) return stopPause;
  if (/[,;:—–-]["')\]]*$/.test(word)) return commaPause;
  return 0;
}

/**
 * Punctuation is timing: after every comma at least `commaPause` and after every inner stop at least `stopPause` of
 * real silence (measured from loudness, not word gaps), cut in at the quietest point between the two words. Word
 * edges from speech recognition can be off by a tenth of a second, so it searches a little wider, and it only ever
 * cuts into real silence: if the words run together it adds nothing (a cut inside a word is an audible glitch).
 * 6 ms fades either side of every insert. Returns `{ x, words, added }` (the word times after a cut move with it).
 */
export function addPauses(x, sr, words, o = {}) {
  const hop = Math.round(0.01 * sr), quiet = 0.03 * peakOf(x), cuts = [];
  words.forEach((w, i) => {
    if (i + 1 >= words.length) return;
    const need = pauseAfter(w.word, o); if (!need) return;
    const a = Math.max(0, Math.round((w.end - 0.15) * sr)), b = Math.min(x.length, Math.round((words[i + 1].start + 0.25) * sr));
    let best = Infinity, at = Math.round(((w.end + words[i + 1].start) / 2) * sr);
    for (let s = a; s < Math.max(a + 1, b - hop); s += hop) { const e = rmsAt(x, s, hop); if (e < best) { best = e; at = s + (hop >> 1); } }
    if (best >= quiet) return;
    let l = at, r = at; while (l - hop > 0 && rmsAt(x, l - hop, hop) < quiet) l -= hop; while (r + hop < x.length && rmsAt(x, r, hop) < quiet) r += hop;
    const have = (r - l) / sr; if (have < need) cuts.push({ at, add: need - have });
  });
  if (!cuts.length) return { x, words, added: 0 };
  const total = cuts.reduce((t, c) => t + Math.round(c.add * sr), 0), y = new Float32Array(x.length + total);
  const fade = Math.round(0.006 * sr), xf = Float32Array.from(x);
  for (const c of cuts) for (let k = 0; k < fade; k++) { const g = k / fade; if (c.at - 1 - k >= 0) xf[c.at - 1 - k] *= g; if (c.at + k < xf.length) xf[c.at + k] *= g; }
  let src = 0, dst = 0;
  for (const c of cuts) { y.set(xf.subarray(src, c.at), dst); dst += c.at - src + Math.round(c.add * sr); src = c.at; }
  y.set(xf.subarray(src), dst);
  const shift = (t) => t + cuts.filter((c) => c.at / sr <= t).reduce((s, c) => s + c.add, 0);
  return { x: y, words: words.map((w) => ({ ...w, start: +shift(w.start).toFixed(3), end: +shift(w.end).toFixed(3) })), added: cuts.length };
}

/** 16-bit PCM WAV bytes (mono) for Float32 samples. */
export function encodeWav(x, sr) {
  const out = new Uint8Array(44 + x.length * 2), v = new DataView(out.buffer), str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, "RIFF"); v.setUint32(4, 36 + x.length * 2, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), true);
  return out;
}
