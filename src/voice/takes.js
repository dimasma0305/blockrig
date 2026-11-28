// Voicing a line: which voice and mood it gets, how a take is judged, and the word times captions use. Fixes from
// the logs:
//   - "why does he say rank last so happily?": an emotion per line; a line ending in "!" defaults to panic;
//   - "the narrator sounded like different people": ONE voice sample for every mood; emotion is performance
//     strength (exaggeration, CFG), tempo within 5% and loudness, never pitch shifting;
//   - "spikes, sad sounds like another voice": a take's pitch stays within 20% of its voice's median (high-energy
//     lines may go 35% up, as viral narrators do; drifting down stays strict);
//   - "hard to understand, same voice for everyone": dialogue lines use their speaker's own voice sample;
//   - runaway takes (the model loses the text and babbles): capped at ~2.5 words/s x 1.8;
//   - Whisper's word times are sometimes nonsense on short clips: used only when they fit and move forward.
import { matchScore, wordCount, syllables } from "./text.js";

/** Moods: ex = exaggeration, cfg = classifier-free guidance weight, tempo (within 5%), gain in dB. Same sample for all. */
export const EMOTIONS = {
  neutral: { ex: 0.9, cfg: 0.35, tempo: 1.0, gain: 0 }, flat: { ex: 0.45, cfg: 0.5, tempo: 1.0, gain: 0 }, happy: { ex: 1.0, cfg: 0.4, tempo: 1.0, gain: 0.5 },
  excited: { ex: 1.05, cfg: 0.38, tempo: 1.03, gain: 1.5 }, panic: { ex: 1.2, cfg: 0.32, tempo: 1.04, gain: 2 }, shocked: { ex: 0.95, cfg: 0.4, tempo: 1.0, gain: 1.5 },
  scared: { ex: 0.9, cfg: 0.35, tempo: 1.0, gain: -1 }, sad: { ex: 0.7, cfg: 0.45, tempo: 0.95, gain: -2 }, serious: { ex: 0.55, cfg: 0.5, tempo: 0.97, gain: -1 },
  smug: { ex: 0.75, cfg: 0.5, tempo: 0.97, gain: 0 }, angry: { ex: 1.1, cfg: 0.4, tempo: 1.02, gain: 2.5 }, whisper: { ex: 0.45, cfg: 0.55, tempo: 0.95, gain: -5 },
};
export const EMOTION_NAMES = Object.keys(EMOTIONS);
/** High-energy moods: their pitch may rise further and still sound like the same person. */
export const LOUD_EMOTIONS = ["panic", "shocked", "excited", "angry", "happy"];

/** The mood a line is voiced in: its `emotion`, else panic for a line ending in "!", else neutral. */
export const moodOf = (line) => (line.emotion && EMOTIONS[line.emotion] ? line.emotion : (line.text ?? line.narration ?? "").trim().endsWith("!") ? "panic" : "neutral");
/** The mood's settings, with the video's own overrides (`{ exaggeration, cfg, panic: { exaggeration, cfg, gain } }`). */
export function emotionSettings(mood, cfg = {}) {
  const e = { ...(EMOTIONS[mood] ?? EMOTIONS.neutral) };
  if (mood === "neutral") { if (cfg.exaggeration != null) e.ex = cfg.exaggeration; if (cfg.cfg != null) e.cfg = cfg.cfg; }
  const o = cfg[mood]; if (o) { if (o.exaggeration != null) e.ex = o.exaggeration; if (o.cfg != null) e.cfg = o.cfg; if (o.gain != null) e.gain = o.gain; if (o.tempo != null) e.tempo = o.tempo; }
  return e;
}
/** Which voice sample speaks a line: its speaker's own (`voices[speaker]`), else the narrator's. */
export const voiceOf = (line, voices = {}) => (line.speaker && voices[line.speaker] ? line.speaker : "narrator");

/** How far (as a fraction) a take's pitch may sit from its voice's median before it sounds like another person. */
export const pitchLimit = (mood, up) => (up && LOUD_EMOTIONS.includes(mood) ? 0.35 : 0.2);
/** The longest a take of this line may run before it counts as babble (seconds): ~2.5 words/s, x1.8, +1 s. */
export const maxTakeSeconds = (text) => (wordCount(text) / 2.5) * 1.8 + 1;

/**
 * Judge a take: `{ text, heard, pitch, refPitch, mood, duration }` -> `{ score, match, off, ok }`. The words come
 * first (a match of 0.95 or more), then the voice (pitch within its limit), then length (not babble). The best
 * score ships; a take that is `ok` stops the search.
 */
export function judgeTake({ text, heard, pitch = 0, refPitch = 0, mood = "neutral", duration = 0 }) {
  const match = matchScore(text, heard), off = refPitch && pitch ? Math.abs(pitch / refPitch - 1) : 0, limit = pitchLimit(mood, pitch > refPitch);
  const tooLong = duration > maxTakeSeconds(text);
  const score = (match >= 0.95 ? 10 + match : match * 8) - Math.max(0, off - limit) * 4 - (tooLong ? 5 : 0);
  return { score, match, off, limit, tooLong, ok: match >= 0.95 && off <= limit && !tooLong };
}

/**
 * Script words with times for the captions, from speech recognition `chunks` (`{ text, timestamp: [start, end] }`):
 * the heard times when they are sane (inside the clip, moving forward, covering at least 40% of it) and the counts
 * agree; otherwise the words are spread by length over the speech.
 */
export function alignWords(text, chunks, duration) {
  const words = text.split(/\s+/).filter(Boolean);
  const ts = (chunks ?? []).map((c) => c.timestamp);
  const ok = ts.length > 0 && ts.every(([a, b], i) => a >= 0 && a <= duration + 0.05 && (b ?? a) <= duration + 0.3 && (i === 0 || a >= ts[i - 1][0]))
    && (ts.at(-1)[1] ?? ts.at(-1)[0]) - ts[0][0] > 0.4 * duration;
  if (ok && chunks.length === words.length) return words.map((w, i) => ({ word: w, start: ts[i][0], end: ts[i][1] ?? ts[i][0] + 0.2 }));
  const t0 = ok ? ts[0][0] : 0.05, t1 = ok ? (ts.at(-1)[1] ?? duration) : Math.max(0.3, duration - 0.05), total = words.reduce((n, w) => n + w.length, 0) || 1;
  let t = t0;
  return words.map((w) => { const d = ((t1 - t0) * w.length) / total, r = { word: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) }; t += d; return r; });
}

/**
 * Estimated word times for a voice that gives only phrase times (`[{ start, end, text? }]`): each phrase's time is
 * spread over its words by syllables; a phrase with its own text takes exactly its words.
 */
export function estimateWords(text, phrases, duration) {
  const words = text.split(/\s+/).filter(Boolean);
  const spans = phrases?.length ? phrases : [{ start: 0, end: duration }];
  const total = spans.reduce((a, p) => a + (p.end - p.start), 0) || 1, wsyl = words.map(syllables), syl = wsyl.reduce((a, b) => a + b, 0);
  const out = []; let wi = 0;
  for (const p of spans) {
    const share = p.text ? p.text.split(/\s+/).filter(Boolean).reduce((n, w) => n + syllables(w), 0) : Math.max(1, Math.round((syl * (p.end - p.start)) / total));
    let acc = 0; const group = [];
    while (wi < words.length && (acc < share || p === spans[spans.length - 1])) { group.push(wi); acc += wsyl[wi]; wi++; }
    let t = p.start; const gs = group.reduce((a, i) => a + wsyl[i], 0) || 1;
    for (const i of group) { const d = ((p.end - p.start) * wsyl[i]) / gs; out.push({ word: words[i], start: +t.toFixed(3), end: +(t + d).toFixed(3) }); t += d; }
  }
  while (wi < words.length) { out.push({ word: words[wi], start: duration, end: duration }); wi++; }
  return out;
}
