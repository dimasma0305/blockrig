// Narration (one clip per shot) + word timings + music sections, from story.json.
//   VOICE_ENGINE=sapi (default, offline placeholder) | edge (natural neural voice; ask the user first)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { compose, writeWav } from "./music.mjs";

const story = JSON.parse(fs.readFileSync("story.json", "utf8"));
const engine = process.env.VOICE_ENGINE || "sapi";
const outDir = "public/audio";
fs.mkdirSync(outDir, { recursive: true });
const py = process.platform === "win32" ? "python" : "python3";
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
    const share = Math.max(1, Math.round((syl * (p.end - p.start)) / total));
    let acc = 0; const group = [];
    while (wi < words.length && (acc < share || p === spans[spans.length - 1])) { group.push(wi); acc += wsyl[wi]; wi++; }
    let t = p.start; const gs = group.reduce((a, i) => a + wsyl[i], 0) || 1;
    for (const i of group) { const d = ((p.end - p.start) * wsyl[i]) / gs; out.push({ word: words[i], start: +t.toFixed(3), end: +(t + d).toFixed(3) }); t += d; }
  }
  while (wi < words.length) { out.push({ word: words[wi], start: duration, end: duration }); wi++; }
  return out;
}

const timings = { engine, fps: story.fps, clips: {} };
for (const s of story.shots) {
  if (!s.narration) continue;
  const out = `${outDir}/${s.id}.wav`;
  if (engine === "edge") {
    execFileSync(py, ["scripts/make_voice_neural.py", "--text", s.narration, "--out", out, "--style", story.voice?.style || "boy", "--fps", String(story.fps)], { stdio: "inherit" });
    const info = JSON.parse(fs.readFileSync(out + ".json", "utf8"));
    timings.clips[s.id] = { duration: info.duration, words: (info.words || []).map((w) => ({ word: w.word ?? w.text, start: w.start, end: w.end })) };
  } else {
    execFileSync(py, ["scripts/make_voice.py", "--text", s.narration, "--out", out, "--fps", String(story.fps), "--pitch", "1.5", "--rate", "4"], { stdio: ["ignore", "ignore", "inherit"] });
    const info = JSON.parse(fs.readFileSync(out + ".json", "utf8"));
    timings.clips[s.id] = { duration: info.duration, words: estimateWords(s.narration, info.phrases, info.duration), estimated: true };
  }
  console.log(`${s.id}  ${timings.clips[s.id].duration.toFixed(2)}s  ${s.narration}`);
}

// total length -> music sections
const gap = story.voice?.gapSeconds ?? 0.12;
let total = 0; const starts = {};
for (const s of story.shots) { starts[s.id] = total; const d = timings.clips[s.id]?.duration ?? 0; total += Math.max(d + gap, s.minSeconds ?? 0); }
timings.music = story.music.map((m, i) => {
  const from = starts[m.fromShot] ?? 0, to = i + 1 < story.music.length ? starts[story.music[i + 1].fromShot] : total;
  const file = `${outDir}/music-${i}.wav`;
  writeWav(file, compose(m.theme, to - from + 1.5, i + 1));
  return { theme: m.theme, file: file.replace(/^public\//, ""), from, to };
});
timings.total = total;
fs.writeFileSync(`${outDir}/timings.json`, JSON.stringify(timings, null, 1));
console.log(`total ${total.toFixed(2)}s, music: ${timings.music.map((m) => `${m.theme} ${m.from.toFixed(1)}-${m.to.toFixed(1)}`).join(", ")}`);
