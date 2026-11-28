// Narration (one clip per shot) + word timings + music sections, from story.json.
//   node scripts/voice.mjs --music-only   keep the narration, rebuild the music (after changing docs/audio.md "Music")
//   VOICE_ENGINE=chatterbox (expressive, offline on a GPU; see make_voice_chatterbox.py) | kokoro (open model, offline) | edge (Microsoft neural voice, online;
//   ask the user first) | sapi (Windows' built-in voice, offline placeholder). Default: story.voice.engine, else sapi.
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { compose, writeWav } from "./music.mjs";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const engine = process.env.VOICE_ENGINE || story.voice?.engine || "sapi";
const outDir = "assets/audio";
fs.mkdirSync(outDir, { recursive: true });
const py = process.platform === "win32" ? "python" : "python3";
// the offline voices (chatterbox, kokoro) run in their own Python environment, made by `npm run setup-voice`
const home = process.env.USERPROFILE || process.env.HOME;
const venvPy = (name) => `${home}/.venvs/${name}/${process.platform === "win32" ? "Scripts/python.exe" : "bin/python"}`;
const voicePy = process.env.VOICE_PY || ["blockrig-voice", "chatterbox"].map(venvPy).find((f) => fs.existsSync(f));
if ((engine === "chatterbox" || engine === "kokoro") && !voicePy) { console.error(`The ${engine} voice is not installed: run npm run setup-voice (or set VOICE_ENGINE=sapi for a placeholder).`); process.exit(1); }
// Fast-paced narration: trim each clip to its speech (TTS pads both ends, which adds up to long gaps between
// lines) and shift the word timings to match. Pauses inside a line ("Rank... last.") are kept.
function trimClip(file, words) {
  const err = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-40dB:d=0.06", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
  const dur = probe(file);
  const starts = [...err.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), ends = [...err.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const head = starts.length && starts[0] < 0.02 ? ends[0] ?? 0 : 0;                 // silence at the very start
  const tail = starts.length && starts[starts.length - 1] > head && (ends[starts.length - 1] ?? dur) >= dur - 0.02 ? starts[starts.length - 1] : dur; // and at the end
  const from = Math.max(0, head - 0.03), to = Math.min(dur, tail + 0.06);
  const tmp = file.replace(/.wav$/, ".trim.wav");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-ss", from.toFixed(3), "-to", to.toFixed(3), tmp]);
  fs.renameSync(tmp, file);
  return { duration: +(to - from).toFixed(3), words: words.map((w) => ({ ...w, start: Math.max(0, +(w.start - from).toFixed(3)), end: Math.max(0, +(w.end - from).toFixed(3)) })) };
}
const probe = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

// estimated word timings (offline voice): spread each phrase's speaking time over its words by syllables
const syllables = (w) => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g) || []).length);
function estimateWords(text, phrases, duration) {
  const words = text.split(/\s+/).filter(Boolean);
  const spans = phrases.length ? phrases : [{ start: 0, end: duration }];
  // assign words to phrases in order, proportional to phrase length
  const total = spans.reduce((a, p) => a + (p.end - p.start), 0), wsyl = words.map(syllables), syl = wsyl.reduce((a, b) => a + b, 0);
  const out = []; let wi = 0;
  for (const p of spans) {
    // a phrase that carries its own text (kokoro) takes exactly its words; otherwise a share by length
    const share = p.text ? p.text.split(/\s+/).filter(Boolean).reduce((n, w) => n + syllables(w), 0) : Math.max(1, Math.round((syl * (p.end - p.start)) / total));
    let acc = 0; const group = [];
    while (wi < words.length && (acc < share || p === spans[spans.length - 1])) { group.push(wi); acc += wsyl[wi]; wi++; }
    let t = p.start; const gs = group.reduce((a, i) => a + wsyl[i], 0) || 1;
    for (const i of group) { const d = ((p.end - p.start) * wsyl[i]) / gs; out.push({ word: words[i], start: +t.toFixed(3), end: +(t + d).toFixed(3) }); t += d; }
  }
  while (wi < words.length) { out.push({ word: words[wi], start: duration, end: duration }); wi++; }
  return out;
}

const timings = { engine, fps: story.fps, clips: {} };
// --music-only: keep the voiced lines and their timings (assets/audio/timings.json), rebuild only the music
const musicOnly = process.argv.includes("--music-only");
if (musicOnly) {
  if (!fs.existsSync(`${outDir}/timings.json`)) throw new Error("no voice yet: run npm run voice first");
  timings.clips = JSON.parse(fs.readFileSync(`${outDir}/timings.json`, "utf8")).clips;
} else {
  // Chatterbox loads a large model, so every line is voiced in one run of its own Python environment
  if (engine === "chatterbox") {
    const lines = story.shots.filter((s) => s.narration).map((s) => ({ id: s.id, text: s.say || s.narration, emotion: s.emotion, speaker: s.speaker, out: `${outDir}/${s.id}.wav` }));
    fs.writeFileSync(`${outDir}/lines.json`, JSON.stringify(lines));
    execFileSync(voicePy, ["scripts/voice/make_voice_chatterbox.py", "--lines", `${outDir}/lines.json`, "--config", JSON.stringify(story.voice?.chatterbox || {})], { stdio: ["ignore", "inherit", "ignore"] });
  }  // the same voice in plain Node, no Python (scripts/voice-js): Chatterbox via onnxruntime-node, Whisper via Transformers.js
  if (engine === "chatterbox-js") {
    const lines = story.shots.filter((s) => s.narration).map((s) => ({ id: s.id, text: s.say || s.narration, emotion: s.emotion, speaker: s.speaker, out: `${outDir}/${s.id}.wav` }));
    fs.writeFileSync(`${outDir}/lines.json`, JSON.stringify(lines));
    execFileSync(process.execPath, ["scripts/voice-js/make_voice.mjs", "--lines", `${outDir}/lines.json`, "--config", JSON.stringify(story.voice?.chatterbox || {})], { stdio: "inherit" });
  }

  for (const s of story.shots) {
    if (!s.narration) continue;
    const out = `${outDir}/${s.id}.wav`;
    if (engine === "edge") {
      execFileSync(py, ["scripts/voice/make_voice_neural.py", "--text", s.narration, "--out", out, "--style", story.voice?.style || "boy", ...(story.voice?.rate ? [`--rate=${story.voice.rate}`] : []), "--fps", String(story.fps)], { stdio: "inherit" });
      const info = JSON.parse(fs.readFileSync(out + ".json", "utf8"));
      timings.clips[s.id] = { duration: info.duration, words: (info.words || []).map((w) => ({ word: w.word ?? w.text, start: w.start, end: w.end })) };
    } else if (engine === "chatterbox" || engine === "chatterbox-js") {
      const info = JSON.parse(fs.readFileSync(out + ".json", "utf8"));
      timings.clips[s.id] = { duration: info.duration, words: info.words, voice: info.engine };
    } else if (engine === "kokoro") {
      const kv = story.voice?.kokoro || {};
      execFileSync(voicePy, ["scripts/voice/make_voice_kokoro.py", "--text", s.narration, "--out", out, "--fps", String(story.fps),
        ...(kv.voice ? ["--voice", kv.voice] : []), ...(kv.speed ? ["--speed", String(kv.speed)] : []), ...(kv.pitch ? ["--pitch", String(kv.pitch)] : [])], { stdio: ["ignore", "ignore", "inherit"] });
      const info = JSON.parse(fs.readFileSync(out + ".json", "utf8"));
      timings.clips[s.id] = { duration: info.duration, words: estimateWords(s.narration, info.phrases, info.duration), estimated: true };
    } else {
      execFileSync(py, ["scripts/voice/make_voice.py", "--text", s.narration, "--out", out, "--fps", String(story.fps), "--pitch", "1.5", "--rate", "4"], { stdio: ["ignore", "ignore", "inherit"] });
      const info = JSON.parse(fs.readFileSync(out + ".json", "utf8"));
      timings.clips[s.id] = { duration: info.duration, words: estimateWords(s.narration, info.phrases, info.duration), estimated: true };
    }
    Object.assign(timings.clips[s.id], trimClip(out, timings.clips[s.id].words));
    console.log(`${s.id}  ${timings.clips[s.id].duration.toFixed(2)}s  ${s.narration}`);
  }
}

// total length -> music sections
const gap = story.voice?.gapSeconds ?? 0.12;
let total = 0; const starts = {};
for (const s of story.shots) { starts[s.id] = total; const d = timings.clips[s.id]?.duration ?? 0; total += Math.max(d + gap, s.minSeconds ?? 0); }
timings.music = story.music.map((m, i) => {
  const from = starts[m.fromShot] ?? 0, to = i + 1 < story.music.length ? starts[story.music[i + 1].fromShot] : total;
  if (m.theme === "none") return { theme: "none", file: null, from, to }; // a silent stretch (room tone): no music
  const file = `${outDir}/music-${i}.wav`;
  writeWav(file, compose(m.theme, to - from + 1.5, i + 1));
  return { theme: m.theme, file: file.replace(/^assets\//, ""), from, to };
});
timings.total = total;
fs.writeFileSync(`${outDir}/timings.json`, JSON.stringify(timings, null, 1));
console.log(`total ${total.toFixed(2)}s, music: ${timings.music.map((m) => `${m.theme} ${m.from.toFixed(1)}-${m.to.toFixed(1)}`).join(", ")}`);
