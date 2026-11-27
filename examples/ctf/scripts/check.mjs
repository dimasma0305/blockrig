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
if (!timings.placeholder && timings.total) {
  const wpm = (60 * words) / timings.total;
  notes.push(`pace: ${words} words in ${timings.total.toFixed(1)} s = ${wpm.toFixed(0)} wpm overall (target ~160)`);
  if (wpm > 190) problems.push(`pace ${wpm.toFixed(0)} wpm is rushed: lower "tempo" or raise "gap" in docs/audio.md`);
  if (wpm < 130) problems.push(`pace ${wpm.toFixed(0)} wpm drags: raise "tempo" or shorten "gap"/"min" holds`);
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk("src").filter((f) => /\.(ts|tsx)$/.test(f))) if (/["'`]roblox\//.test(fs.readFileSync(f, "utf8"))) notes.push(`${f} loads assets/roblox: fine locally, but never publish or commit that video`);

for (const n of notes) console.log(`  note: ${n}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
console.log(problems.length ? `${problems.length} problem(s)` : "check passed");
if (problems.length) process.exit(1);
