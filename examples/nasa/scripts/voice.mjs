// Narration (one clip per shot) + word timings + music sections, from story.json.
//   node scripts/voice.mjs --music-only   keep the narration, rebuild the music (after changing docs/audio.md "Music")
//   VOICE_ENGINE=chatterbox (expressive, offline on a GPU; see make_voice_chatterbox.py) | kokoro (open model, offline) | edge (Microsoft neural voice, online;
//   ask the user first) | sapi (Windows' built-in voice, offline placeholder). Default: story.voice.engine, else sapi.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { compose, writeWav } from "./music.mjs";
import { trimToSpeech, encodeWav, estimateWords, musicSections } from "blockrig/voice";

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
// lines) and shift the word timings to match. Pauses inside a line ("Rank... last.") are kept. The decisions (where
// the speech is, estimated word times, music sections) are BlockRig's (blockrig/voice), tested there.
const SR = 48000;
function trimClip(file, words) {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "pipe:1"], { maxBuffer: 1e9 });
  const x = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const t = trimToSpeech(x, SR, words, { quiet: 0.01 }); // about -40 dB under the peak, as ffmpeg's silencedetect was
  fs.writeFileSync(file, encodeWav(t.x, SR));
  return { duration: t.duration, words: t.words };
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

// total length -> music sections (theme "none" is a silent stretch: no music)
const { total, sections } = musicSections(story, Object.fromEntries(Object.entries(timings.clips).map(([id, c]) => [id, c.duration])));
timings.music = sections.map((m) => {
  if (m.silent) return { theme: "none", file: null, from: m.from, to: m.to };
  const file = `${outDir}/music-${m.index}.wav`;
  writeWav(file, compose(m.theme, m.to - m.from + 1.5, m.index + 1));
  return { theme: m.theme, file: file.replace(/^assets\//, ""), from: m.from, to: m.to };
});
timings.total = total;
fs.writeFileSync(`${outDir}/timings.json`, JSON.stringify(timings, null, 1));
console.log(`total ${total.toFixed(2)}s, music: ${timings.music.map((m) => `${m.theme} ${m.from.toFixed(1)}-${m.to.toFixed(1)}`).join(", ")}`);
