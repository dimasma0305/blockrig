// Checks an agent can run without hearing or watching: run after `npm run voice` and before a render.
//   - every narrated shot has a clip, and (chatterbox) the take says the right words
//   - one voice per speaker: each clip's pitch near its voice's median (a big jump sounds like another person)
//   - pace: overall words per minute over the spoken shots against the target in docs/audio.md (~160)
//   - caption word times move forward and stay inside their clip
//   - assets: what loads assets/roblox (fine in videos; the files stay out of git)
// The checks live in BlockRig (blockrig/voice: pitchReport, pace, wordTimeProblems), tested there.
import fs from "node:fs";
import path from "node:path";
import { pace, pitchReport, wordTimeProblems, moodOf } from "blockrig/voice";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const timings = JSON.parse(fs.readFileSync("assets/audio/timings.json", "utf8"));
const problems = [], notes = [];
const meta = (id) => { const f = `assets/audio/${id}.wav.json`; return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };

if (timings.placeholder) notes.push("no voice yet (placeholder timings): run npm run voice");
const clips = [];
for (const s of story.shots) {
  if (!s.narration) continue;
  const c = timings.clips?.[s.id];
  if (!timings.placeholder && !c) { problems.push(`${s.id}: no narration clip`); continue; }
  const m = meta(s.id);
  if (m) {
    if (m.match !== undefined && m.match < 0.85) problems.push(`${s.id}: the voice take matches the script only ${(m.match * 100).toFixed(0)}% ("${s.narration}")`);
    if (m.engine === "kokoro" && story.voice?.engine === "chatterbox") notes.push(`${s.id}: spoken by the Kokoro fallback (short or hard line)`);
    if (m.pitch > 0) clips.push({ id: s.id, pitch: m.pitch, mood: moodOf(s), speaker: s.speaker, yin: m.yin ?? 1 });
  }
  if (c) problems.push(...wordTimeProblems(s.id, c));
}
// pitches measured before BlockRig's YIN fix read ~7% low: compare like with like
const fixed = clips.filter((c) => c.yin >= 2), old = clips.filter((c) => c.yin < 2);
if (fixed.length && old.length) notes.push(`${old.length} take(s) were measured with the old pitch tracker (~7% low): re-voice them (VOICE_ONLY=${old.map((c) => c.id).join(",")} npm run voice) to compare their pitch`);
const voices = story.voice?.chatterbox?.voices ?? {};
for (const group of [fixed, old]) {
  const r = pitchReport(group, voices);
  for (const [v, hz] of Object.entries(r.medians)) notes.push(`${v} pitch: median ${hz.toFixed(0)} Hz${group === old && fixed.length ? " (old tracker)" : ""}`);
  problems.push(...r.problems); notes.push(...r.notes);
}
if (!timings.placeholder && timings.total) {
  const p = pace(story.shots, timings.total);
  if (p.silent) notes.push(`silent beats: ${p.silent.toFixed(1)} s (not counted in the pace)`);
  notes.push(`pace: ${p.words} words in ${p.seconds.toFixed(1)} s of spoken shots = ${p.wpm.toFixed(0)} wpm overall (target ~160)`);
  if (p.problem) problems.push(p.problem);
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk("src").filter((f) => /\.(ts|tsx)$/.test(f))) if (/["'`]roblox\//.test(fs.readFileSync(f, "utf8"))) notes.push(`${f} loads assets/roblox: fine in videos (Roblox allows it); keep the files out of git`);

for (const n of notes) console.log(`  note: ${n}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
console.log(problems.length ? `${problems.length} problem(s)` : "check passed");
if (problems.length) process.exit(1);
