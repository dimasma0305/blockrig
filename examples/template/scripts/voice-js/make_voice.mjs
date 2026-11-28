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
// Every decision (moods, voices, take judging, pitch, pauses, word times) is BlockRig's (blockrig/voice), tested
// there; this script runs the models. Takes record `yin: 2`: their pitch comes from BlockRig's fixed YIN (the old
// tracker read ~7% low), so npm run check never compares the two.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pipeline, env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import { loadChatterbox, SR } from "./chatterbox.mjs";
import { emotionSettings, moodOf, voiceOf as voiceFor, judgeTake, maxTakeSeconds, medianPitch, alignWords, addPauses, encodeWav, pitchReport } from "blockrig/voice";

env.cacheDir = path.join(os.homedir(), ".cache", "transformers-js");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const cfg = { voice: "am_adam", pitch: 1.35, exaggeration: 0.9, cfg: 0.35, tempo: 1.0, takes: 8,
  prompt: "In this world, everybody plays the game. Even the bakery hides a secret in its receipts. Kids learn it before they can read. And me? I'm ranked last. Tonight is the final.",
  ...JSON.parse(arg("--config") || "{}") };
// VOICE_ONLY=s03,s07 re-voices just those lines (the others keep their takes)
const only = process.env.VOICE_ONLY ? new Set(process.env.VOICE_ONLY.split(",")) : null;
const lines = JSON.parse(fs.readFileSync(arg("--lines"), "utf8")).filter((l) => !only || only.has(l.id));
// the moods (one voice sample; emotion = performance strength, tempo within 5%, loudness), with docs/audio.md's
// exaggeration / cfg for neutral and its "panic" overrides
const EMO = (mood) => emotionSettings(mood, cfg);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-js-"));
const readPcm = (file, sr) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(sr), "pipe:1"], { maxBuffer: 1e9 }); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const writeWav = (file, x, sr) => fs.writeFileSync(file, encodeWav(x, sr));
const ff = (src, dst, af, sr = 48000) => execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-af", af, "-ar", String(sr), "-ac", "1", dst]);
const pitch = (x) => medianPitch(x, 16000);
const PAUSES = { commaPause: cfg.commaPause ?? 0.22, stopPause: cfg.stopPause ?? 0.4 };

console.log("loading Kokoro, Chatterbox and Whisper (ONNX, CPU)...");
const kokoro = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
const cb = await loadChatterbox();
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-small.en_timestamped", { dtype: "fp32" });
// the voice samples: the narrator's (every line), or a speaker's own from cfg.voices (dialogue: Mom, Dad...)
const VOICES = cfg.voices ?? {}, voiceOf = (L) => voiceFor(L, VOICES);
async function useVoice(who) {
  const v = who === "narrator" ? { voice: cfg.voice, pitch: cfg.pitch } : VOICES[who];
  const k = await kokoro.generate(cfg.prompt, { voice: v.voice, speed: 0.95 });
  fs.writeFileSync(`${tmp}/k.wav`, Buffer.from(k.toWav()));
  ff(`${tmp}/k.wav`, `${tmp}/prompt.wav`, Math.abs(v.pitch - 1) > 1e-3 ? `rubberband=pitch=${v.pitch}:formant=shifted` : "anull", SR);
  await cb.setVoice(readPcm(`${tmp}/prompt.wav`, SR));
}
lines.sort((a, b) => voiceOf(a).localeCompare(voiceOf(b)));
// each voice = what npm run check measures: the median pitch of that voice's lines already voiced (when VOICE_ONLY
// re-voices a few), else its prompt's own pitch
const ALL = JSON.parse(fs.readFileSync(arg("--lines"), "utf8"));
// `round` shifts the seeds, so a line voiced again gets new takes
async function voiceLine(L, refPitch, round = 0) {
  const mood = moodOf(L), emo = EMO(mood);
  let best = null;
  for (let take = 0; take < cfg.takes; take++) {
    // a runaway take (Chatterbox without CFG sometimes loses the text and babbles) stops early: ~2.5 words/s, x1.8, 25 speech tokens/s
    const maxSec = maxTakeSeconds(L.text);
    const t0 = Date.now(), raw = await cb.speak(L.text, { exaggeration: emo.ex, cfg: emo.cfg, seed: 1000 + (take + round * cfg.takes) * 7919 + L.text.length, maxTokens: Math.round(maxSec * 25) });
    writeWav(`${tmp}/raw.wav`, raw, SR);
    // tempo and loudness for the emotion (never pitch): exactly what ships
    ff(`${tmp}/raw.wav`, `${tmp}/take.wav`, [Math.abs(emo.tempo - 1) > 1e-3 ? `atempo=${emo.tempo}` : null, `silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.25`, `loudnorm=I=${-16 + emo.gain}:TP=-1.5:LRA=7`].filter(Boolean).join(","));
    const pcm = readPcm(`${tmp}/take.wav`, 16000), heard = await asr(pcm, { return_timestamps: "word" });
    const hz = pitch(pcm), dur = pcm.length / 16000;
    // words first, then one voice (the same pitch limits as npm run check), then length (babble hits the cap)
    const j = judgeTake({ text: L.text, heard: heard.text, pitch: hz, refPitch, mood, duration: dur }), match = j.match, score = j.score;
    console.log(`  ${L.id} take ${take}: match ${match.toFixed(2)} pitch ${hz.toFixed(0)} Hz ${dur.toFixed(2)}s (${((Date.now() - t0) / 1000).toFixed(1)}s)  "${heard.text.trim()}"`);
    if (!best || score > best.score) { best = { score, match, hz, dur, heard }; fs.copyFileSync(`${tmp}/take.wav`, L.out); }
    if (j.ok) break;
  }
  // breaths at commas and stops, in the shipped 48 kHz file
  const shipped = readPcm(L.out, 48000), b = addPauses(shipped, 48000, alignWords(L.text, best.heard.chunks ?? [], best.dur), PAUSES);
  if (b.added) writeWav(L.out, b.x, 48000);
  const duration = b.x.length / 48000;
  fs.writeFileSync(L.out + ".json", JSON.stringify({ duration: +duration.toFixed(3), engine: "chatterbox-js", voice: voiceOf(L), emotion: mood, match: +best.match.toFixed(3), pitch: +best.hz.toFixed(1), yin: 2, words: b.words }));
  console.log(`${L.id}  chatterbox-js ${mood.padEnd(8)} match ${best.match.toFixed(2)}  ${best.hz.toFixed(0).padStart(4)} Hz  ${duration.toFixed(2)}s  ${b.added ? "+" + b.added + " pause " : ""}${L.text}`);
}

const takeOf = (l) => { try { return JSON.parse(fs.readFileSync(l.out + ".json", "utf8")); } catch { return null; } };
let current = null, refPitch = 0;
for (const L of lines) {
  if (voiceOf(L) !== current) {
    current = voiceOf(L); await useVoice(current);
    // (only takes measured with the same pitch tracker: yin 2)
    const voiced = ALL.filter((l) => voiceOf(l) === current && !only?.has(l.id)).map((l) => { const m = takeOf(l); return m?.yin >= 2 ? m.pitch || 0 : 0; }).filter(Boolean).sort((a, b) => a - b);
    refPitch = voiced.length >= 3 ? voiced[voiced.length >> 1] : pitch(readPcm(`${tmp}/prompt.wav`, 16000));
    console.log(`${current} pitch ${refPitch.toFixed(0)} Hz${voiced.length >= 3 ? " (median of its other lines)" : ""}`);
  }
  await voiceLine(L, refPitch);
}

// one voice per speaker, as npm run check measures it: takes were judged against the voice sample (or the other
// lines), but the check compares each take with the median of the finished ones, and the two can disagree. Lines
// that are off their voice's median are voiced once more against it (new seeds); a better take replaces the old.
const report = pitchReport(ALL.map((l) => { const m = takeOf(l); return { id: l.id, speaker: l.speaker, mood: moodOf(l), pitch: m?.yin >= 2 ? m.pitch : 0 }; }), VOICES);
const again = report.outliers.filter((o) => lines.some((l) => l.id === o.id));
if (again.length) {
  console.log(`re-voicing ${again.length} line(s) off their voice's median pitch: ${again.map((o) => `${o.id} ${(o.off * 100).toFixed(0)}%`).join(", ")}`);
  current = null;
  for (const o of again.sort((a, b) => a.voice.localeCompare(b.voice))) {
    const L = lines.find((l) => l.id === o.id), before = takeOf(L);
    if (o.voice !== current) { current = o.voice; await useVoice(current); }
    fs.copyFileSync(L.out, `${tmp}/keep.wav`); fs.copyFileSync(L.out + ".json", `${tmp}/keep.json`);
    await voiceLine(L, o.median, 1);
    const after = takeOf(L), offBefore = Math.abs(before.pitch / o.median - 1), offAfter = Math.abs(after.pitch / o.median - 1);
    // keep the new take only if it says the line as well and sits closer to the voice
    if (after.match < before.match - 1e-9 || offAfter >= offBefore) { fs.copyFileSync(`${tmp}/keep.wav`, L.out); fs.copyFileSync(`${tmp}/keep.json`, L.out + ".json"); console.log(`  ${L.id}: kept the first take`); }
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
