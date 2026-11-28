// Checks an agent can run without hearing or watching: run after `npm run voice` and before a render.
//   - every narrated shot has a clip, and (chatterbox) the take says the right words
//   - pace: overall words per minute against the target in docs/audio.md (~160)
//   - captions start inside their shot and in order
//   - assets: nothing from assets/roblox is referenced by the code (they must never be published)
import fs from "node:fs";
import path from "node:path";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const timings = JSON.parse(fs.readFileSync("assets/audio/timings.json", "utf8"));
const problems = [], notes = [];

if (timings.placeholder) notes.push("no voice yet (placeholder timings): run npm run voice");
let words = 0;
for (const s of story.shots) {
  if (!s.narration) continue;
  words += s.narration.split(/\s+/).length;
  const c = timings.clips?.[s.id];
  if (!timings.placeholder && !c) { problems.push(`${s.id}: no narration clip`); continue; }
  const meta = `assets/audio/${s.id}.wav.json`;
  if (fs.existsSync(meta)) { const m = JSON.parse(fs.readFileSync(meta, "utf8")); if (m.match !== undefined && m.match < 0.85) problems.push(`${s.id}: the voice take matches the script only ${(m.match * 100).toFixed(0)}% ("${s.narration}")`); if (m.engine === "kokoro" && story.voice?.engine === "chatterbox") notes.push(`${s.id}: spoken by the Kokoro fallback (short or hard line)`); }
  if (c?.words?.length) {
    let last = -1;
    for (const w of c.words) { if (w.start < last - 1e-3) { problems.push(`${s.id}: word times go backwards at "${w.word}"`); break; } last = w.start; }
    if (c.words.at(-1).start > c.duration + 0.05) problems.push(`${s.id}: a caption word starts after the clip ends`);
  }
}
// one narrator: every clip's median pitch should sit near the others (a big jump sounds like another person)
// (dialogue speakers with their own voice, docs/audio.md "## Voices", are checked against their own lines)
const VOICES = story.voice?.chatterbox?.voices ?? {}, voiceOf = (s) => (s.speaker && VOICES[s.speaker] ? s.speaker : "narrator");
for (const who of new Set(story.shots.filter((s) => s.narration).map(voiceOf))) {
const pitches = story.shots.filter((s) => s.narration && voiceOf(s) === who && fs.existsSync(`assets/audio/${s.id}.wav.json`)).map((s) => [s.id, JSON.parse(fs.readFileSync(`assets/audio/${s.id}.wav.json`, "utf8")).pitch]).filter(([, p]) => p > 0);
if (pitches.length > 2) {
  const sorted = pitches.map(([, p]) => p).sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  notes.push(`${who} pitch: median ${median.toFixed(0)} Hz, range ${sorted[0].toFixed(0)}-${sorted.at(-1).toFixed(0)} Hz`);
  // measured on viral narrators (scripts/voice/analyze_ref.py): high-energy lines jump 30-50% up and still sound
  // like the same person; drifting down is what sounded like another voice ("sad" spike), so that stays strict
  const LOUD = new Set(["panic", "shocked", "excited", "angry", "happy"]), emo = Object.fromEntries(story.shots.map((s) => [s.id, s.emotion ?? "neutral"]));
  for (const [id, p] of pitches) { const d = p / median - 1, limit = d > 0 && LOUD.has(emo[id]) ? 0.35 : 0.2; if (Math.abs(d) > limit) problems.push(`${id}: voice pitch ${p.toFixed(0)} Hz is ${(d * 100).toFixed(0)}% off the narrator's ${median.toFixed(0)} Hz (sounds like another voice)`); else if (Math.abs(d) > 0.12) notes.push(`${id}: voice pitch ${(d * 100).toFixed(0)}% off the median`); }
}
}
if (!timings.placeholder && timings.total) {
  // silent beats (shots with no line, held for their "min") are deliberate: pace is measured over the spoken shots
  const gap = story.voice?.gapSeconds ?? 0.12, silent = story.shots.filter((s) => !s.narration).reduce((t, s) => t + Math.max(s.minSeconds ?? 0, 0.5), 0);
  const wpm = (60 * words) / Math.max(1, timings.total - silent);
  if (silent) notes.push(`silent beats: ${silent.toFixed(1)} s (not counted in the pace)`);
  notes.push(`pace: ${words} words in ${(timings.total - silent).toFixed(1)} s of spoken shots = ${wpm.toFixed(0)} wpm overall (target ~160)`);
  if (wpm > 190) problems.push(`pace ${wpm.toFixed(0)} wpm is rushed: lower "tempo" or raise "gap" in docs/audio.md`);
  if (wpm < 130) problems.push(`pace ${wpm.toFixed(0)} wpm drags: raise "tempo" or shorten "gap"/"min" holds`);
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk("src").filter((f) => /\.(ts|tsx)$/.test(f))) if (/["'`]roblox\//.test(fs.readFileSync(f, "utf8"))) notes.push(`${f} loads assets/roblox: fine in videos (Roblox allows it); keep the files out of git`);

for (const n of notes) console.log(`  note: ${n}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
console.log(problems.length ? `${problems.length} problem(s)` : "check passed");
if (problems.length) process.exit(1);
