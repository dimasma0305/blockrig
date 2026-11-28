// The narration in plain Node (no Python): engine "chatterbox-js" in docs/audio.md.
//   node scripts/voice-js/make_voice.mjs --lines assets/audio/lines.json --config '{...}'
// Same job as scripts/voice/make_voice_chatterbox.py:
// - the voice sample: Kokoro (kokoro-js) reading our own text as am_adam, pitched x1.35 with Rubber Band (ffmpeg);
// - every line: Chatterbox (scripts/voice-js/chatterbox.mjs) copying that one sample (one narrator), emotion from
//   `exaggeration`, then tempo and loudness per emotion (ffmpeg), up to `takes` takes;
// - every take checked with Whisper (Transformers.js): the words must match the script (letter by letter), and the
//   pitch must stay near the narrator's; the best take ships, with word times for the captions.
// Also: real breaths at commas and stops (commaPause / stopPause). Not ported: per-word clarity scores (Transformers.js
// gives no word probabilities; CFG plus the letter-level word match carries that job).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pipeline, env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import { loadChatterbox, SR } from "./chatterbox.mjs";

env.cacheDir = path.join(os.homedir(), ".cache", "transformers-js");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const cfg = { voice: "am_adam", pitch: 1.35, exaggeration: 0.9, cfg: 0.35, tempo: 1.0, takes: 8,
  prompt: "In this world, everybody plays the game. Even the bakery hides a secret in its receipts. Kids learn it before they can read. And me? I'm ranked last. Tonight is the final.",
  ...JSON.parse(arg("--config") || "{}") };
// VOICE_ONLY=s03,s07 re-voices just those lines (the others keep their takes)
const only = process.env.VOICE_ONLY ? new Set(process.env.VOICE_ONLY.split(",")) : null;
const lines = JSON.parse(fs.readFileSync(arg("--lines"), "utf8")).filter((l) => !only || only.has(l.id));
// the same moods as the Python engine (one voice sample; emotion = performance strength, tempo within 5%, loudness)
const EMOTIONS = { // ex = exaggeration, cfg = classifier-free guidance weight (as the Python engine)
  neutral: { ex: cfg.exaggeration, cfg: cfg.cfg, tempo: 1.0, gain: 0 }, flat: { ex: 0.45, cfg: 0.5, tempo: 1.0, gain: 0 }, happy: { ex: 1.0, cfg: 0.4, tempo: 1.0, gain: 0.5 },
  excited: { ex: 1.05, cfg: 0.38, tempo: 1.03, gain: 1.5 }, panic: { ex: 1.2, cfg: 0.32, tempo: 1.04, gain: 2 }, shocked: { ex: 0.95, cfg: 0.4, tempo: 1.0, gain: 1.5 },
  scared: { ex: 0.9, cfg: 0.35, tempo: 1.0, gain: -1 }, sad: { ex: 0.7, cfg: 0.45, tempo: 0.95, gain: -2 }, serious: { ex: 0.55, cfg: 0.5, tempo: 0.97, gain: -1 },
  smug: { ex: 0.75, cfg: 0.5, tempo: 0.97, gain: 0 }, angry: { ex: 1.1, cfg: 0.4, tempo: 1.02, gain: 2.5 }, whisper: { ex: 0.45, cfg: 0.55, tempo: 0.95, gain: -5 },
};
if (cfg.panic) Object.assign(EMOTIONS.panic, { ex: cfg.panic.exaggeration ?? EMOTIONS.panic.ex, cfg: cfg.panic.cfg ?? EMOTIONS.panic.cfg, gain: cfg.panic.gain ?? EMOTIONS.panic.gain });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-js-"));
const readPcm = (file, sr) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(sr), "pipe:1"], { maxBuffer: 1e9 }); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
function writeWav(file, x, sr) {
  const b = Buffer.alloc(44 + x.length * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, b);
}
const ff = (src, dst, af, sr = 48000) => execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-af", af, "-ar", String(sr), "-ac", "1", dst]);
// median voiced pitch (Hz) by YIN (de Cheveigne & Kawahara 2002) over 40 ms frames at 16 kHz, 70-400 Hz: the
// cumulative-mean-normalised difference, first dip under 0.15 (robust to the octave errors plain autocorrelation makes)
function pitch(x) {
  const n = 640, minL = 40, maxL = 228, out = [], d = new Float32Array(maxL + 1);
  for (let s = 0; s + n + maxL < x.length; s += 320) {
    let e = 0; for (let i = 0; i < n; i++) e += x[s + i] * x[s + i];
    if (e / n < 1e-4) continue;
    for (let L = 1; L <= maxL; L++) { let v = 0; for (let i = 0; i < n; i++) { const t = x[s + i] - x[s + i + L]; v += t * t; } d[L] = v; }
    let run = 0, lag = 0;
    for (let L = 1; L <= maxL; L++) {
      run += d[L]; const cm = (d[L] * L) / (run || 1);
      if (L >= minL && cm < 0.15) { while (L + 1 <= maxL && (d[L + 1] * (L + 1)) / (run + d[L + 1]) < cm) { L++; run += d[L]; } lag = L; break; }
    }
    if (lag) out.push(16000 / lag);
  }
  out.sort((a, b) => a - b); return out.length ? out[out.length >> 1] : 0;
}
const NUM = { 0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 10: "ten", knew: "new", their: "there", too: "to", two: "to", four: "for", through: "threw", thru: "threw", and: "an" }; // homophones count as right ("an" is often heard as "and")
// numbers as Whisper writes them ("$5,000", "11", "6") are spelled out first, so "five thousand dollars" matches
const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" "), TENS = "  twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
const say = (n) => n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "") : n < 1000 ? ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + say(n % 100) : "") : say(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + say(n % 1000) : "");
const spellNumbers = (s) => s.replace(/(\$?)(\d[\d,]*)(th)?/g, (m, dollar, d, th) => { const n = +d.replace(/,/g, ""); return n < 1e6 ? say(n) + (th ? "th" : "") + (dollar ? " dollars" : "") : m; });
const norm = (s) => spellNumbers(s).toLowerCase().replace(/-/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map((w) => NUM[w] ?? w);
function similarity(a, b) { // letters only, spaces ignored ("bot net" = "botnet"); 1 - edit distance / length
  const x = norm(a).join(""), y = norm(b).join(""); const d = Array.from({ length: x.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - d[x.length][y.length] / Math.max(x.length, y.length, 1);
}
// script words with times: the heard words in order when the counts agree, otherwise spread by length over the speech
function wordsFor(text, chunks, duration) {
  const words = text.split(/\s+/).filter(Boolean);
  // Whisper's word times are sometimes nonsense on short clips (times past the end, all words at one instant): use
  // them only when they fit inside the clip and move forward; otherwise spread the words by length
  const ts = chunks.map((c) => c.timestamp), ok = ts.length > 0 && ts.every(([a, b], i) => a >= 0 && a <= duration + 0.05 && (b ?? a) <= duration + 0.3 && (i === 0 || a >= ts[i - 1][0]))
    && (ts.at(-1)[1] ?? ts.at(-1)[0]) - ts[0][0] > 0.4 * duration;
  if (ok && chunks.length === words.length) return words.map((w, i) => ({ word: w, start: chunks[i].timestamp[0], end: chunks[i].timestamp[1] ?? chunks[i].timestamp[0] + 0.2 }));
  const t0 = ok ? ts[0][0] : 0.05, t1 = ok ? (ts.at(-1)[1] ?? duration) : Math.max(0.3, duration - 0.05), total = words.reduce((n, w) => n + w.length, 0);
  let t = t0; return words.map((w) => { const d = ((t1 - t0) * w.length) / total, r = { word: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) }; t += d; return r; });
}

// punctuation is timing: every comma gets at least commaPause and every inner "..." / stop at least stopPause of
// real silence (measured from loudness, not word gaps), cut in at the quietest point between the two words; the word
// times after each cut move with it (captions follow). Returns the new samples and words.
const COMMA = cfg.commaPause ?? 0.22, STOP_P = cfg.stopPause ?? 0.4;
function breathe(x, sr, words) {
  const hop = Math.round(0.01 * sr), rms = (i) => { let e = 0, n = 0; for (let k = Math.max(0, i); k < Math.min(x.length, i + hop); k++, n++) e += x[k] * x[k]; return Math.sqrt(e / (n || 1)); };
  let peak = 0; for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const quiet = 0.03 * peak, cuts = [];
  words.forEach((w, i) => {
    if (i + 1 >= words.length) return;
    const need = /(\.\.\.|…|[.!?])["')]*$/.test(w.word) ? STOP_P : /[,;:—-]["')]*$/.test(w.word) ? COMMA : 0;
    if (!need) return;
    // Whisper's word edges can be off by a tenth of a second: search a little wider, and only ever cut into real
    // silence. If there is none (the words run together), add no pause: a cut inside a word is an audible glitch
    // (one split "Sawit" in two after "hills.").
    const a = Math.max(0, Math.round((w.end - 0.15) * sr)), b = Math.min(x.length, Math.round((words[i + 1].start + 0.25) * sr));
    let best = Infinity, at = Math.round(((w.end + words[i + 1].start) / 2) * sr);
    for (let s = a; s < Math.max(a + 1, b - hop); s += hop) { const e = rms(s); if (e < best) { best = e; at = s + (hop >> 1); } }
    if (best >= quiet) return;
    let l = at, r = at; while (l - hop > 0 && rms(l - hop) < quiet) l -= hop; while (r + hop < x.length && rms(r) < quiet) r += hop;
    const have = (r - l) / sr; if (have < need) cuts.push({ at, add: need - have });
  });
  if (!cuts.length) return { x, words, n: 0 };
  const total = cuts.reduce((t, c) => t + Math.round(c.add * sr), 0), y = new Float32Array(x.length + total);
  let src = 0, dst = 0;
  // 6 ms fades either side of every insert, so even a cut in near-silence can't click
  const fade = Math.round(0.006 * sr), xf = Float32Array.from(x);
  for (const c of cuts) for (let k = 0; k < fade; k++) { const g = k / fade; if (c.at - 1 - k >= 0) xf[c.at - 1 - k] *= g; if (c.at + k < xf.length) xf[c.at + k] *= g; }
  for (const c of cuts) { y.set(xf.subarray(src, c.at), dst); dst += c.at - src; dst += Math.round(c.add * sr); src = c.at; }
  y.set(xf.subarray(src), dst);
  const shift = (t) => t + cuts.filter((c) => c.at / sr <= t).reduce((s, c) => s + c.add, 0);
  return { x: y, words: words.map((w) => ({ ...w, start: +shift(w.start).toFixed(3), end: +shift(w.end).toFixed(3) })), n: cuts.length };
}

console.log("loading Kokoro, Chatterbox and Whisper (ONNX, CPU)...");
const kokoro = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
const cb = await loadChatterbox();
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-small.en_timestamped", { dtype: "fp32" });
// the one voice sample every line copies
const k = await kokoro.generate(cfg.prompt, { voice: cfg.voice, speed: 0.95 });
fs.writeFileSync(`${tmp}/k.wav`, Buffer.from(k.toWav()));
ff(`${tmp}/k.wav`, `${tmp}/prompt.wav`, `rubberband=pitch=${cfg.pitch}:formant=shifted`, SR);
const promptPcm = readPcm(`${tmp}/prompt.wav`, SR);
await cb.setVoice(promptPcm);
// one narrator = what npm run check measures: the median pitch of the lines already voiced (when VOICE_ONLY
// re-voices a few), else the voice prompt's own pitch
const voiced = JSON.parse(fs.readFileSync(arg("--lines"), "utf8")).filter((l) => !only?.has(l.id)).map((l) => {
  try { return JSON.parse(fs.readFileSync(l.out + ".json", "utf8")).pitch || 0; } catch { return 0; }
}).filter(Boolean).sort((a, b) => a - b);
const refPitch = voiced.length >= 3 ? voiced[voiced.length >> 1] : pitch(readPcm(`${tmp}/prompt.wav`, 16000));
console.log(`narrator pitch ${refPitch.toFixed(0)} Hz${voiced.length >= 3 ? " (median of the other lines)" : ""}`);

for (const L of lines) {
  const mood = L.emotion || (L.text.trim().endsWith("!") ? "panic" : "neutral"), emo = EMOTIONS[mood] ?? EMOTIONS.neutral;
  let best = null;
  for (let take = 0; take < cfg.takes; take++) {
    // a runaway take (Chatterbox without CFG sometimes loses the text and babbles) stops early: ~2.5 words/s, x1.8, 25 speech tokens/s
    const words = L.text.split(/\s+/).length, maxSec = (words / 2.5) * 1.8 + 1;
    const t0 = Date.now(), raw = await cb.speak(L.text, { exaggeration: emo.ex, cfg: emo.cfg, seed: 1000 + take * 7919 + L.text.length, maxTokens: Math.round(maxSec * 25) });
    writeWav(`${tmp}/raw.wav`, raw, SR);
    // tempo and loudness for the emotion (never pitch): exactly what ships
    ff(`${tmp}/raw.wav`, `${tmp}/take.wav`, [Math.abs(emo.tempo - 1) > 1e-3 ? `atempo=${emo.tempo}` : null, `silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.25`, `loudnorm=I=${-16 + emo.gain}:TP=-1.5:LRA=7`].filter(Boolean).join(","));
    const pcm = readPcm(`${tmp}/take.wav`, 16000), heard = await asr(pcm, { return_timestamps: "word" });
    const match = similarity(L.text, heard.text), hz = pitch(pcm), off = refPitch ? Math.abs(hz / refPitch - 1) : 0, dur = pcm.length / 16000;
    // words first, then one narrator: the same pitch limits as npm run check (high-energy lines may go 35% up)
    const loud = ["panic", "shocked", "excited", "angry", "happy"].includes(mood), up = hz > refPitch;
    const limit = up && loud ? 0.35 : 0.2, tooLong = dur > maxSec; // tooLong: it hit the cap (babble)
    const score = (match >= 0.95 ? 10 + match : match * 8) - Math.max(0, off - limit) * 4 - (tooLong ? 5 : 0);
    console.log(`  ${L.id} take ${take}: match ${match.toFixed(2)} pitch ${hz.toFixed(0)} Hz ${dur.toFixed(2)}s (${((Date.now() - t0) / 1000).toFixed(1)}s)  "${heard.text.trim()}"`);
    if (!best || score > best.score) { best = { score, match, hz, dur, heard }; fs.copyFileSync(`${tmp}/take.wav`, L.out); }
    if (match >= 0.95 && off <= limit && !tooLong) break;
  }
  // breaths at commas and stops, in the shipped 48 kHz file
  const shipped = readPcm(L.out, 48000), b = breathe(shipped, 48000, wordsFor(L.text, best.heard.chunks ?? [], best.dur));
  if (b.n) writeWav(L.out, b.x, 48000);
  const duration = b.x.length / 48000;
  fs.writeFileSync(L.out + ".json", JSON.stringify({ duration: +duration.toFixed(3), engine: "chatterbox-js", emotion: mood, match: +best.match.toFixed(3), pitch: +best.hz.toFixed(1), words: b.words }));
  best.dur = duration; best.pauses = b.n;
  console.log(`${L.id}  chatterbox-js ${mood.padEnd(8)} match ${best.match.toFixed(2)}  ${best.hz.toFixed(0).padStart(4)} Hz  ${best.dur.toFixed(2)}s  ${best.pauses ? "+" + best.pauses + " pause " : ""}${L.text}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
