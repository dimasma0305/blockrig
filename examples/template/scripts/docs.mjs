// Compile docs/story.md + docs/audio.md (the source of truth) into src/generated/story.json, which the code
// and the voice script read, and check it. Never edit the generated file; edit the docs and run `npm run docs`.
//   node scripts/docs.mjs          compile + check (exits 1 on errors, prints warnings)
import fs from "node:fs";
import path from "node:path";
import { THEME_NAMES } from "./music.mjs";

const EXPRESSIONS = "neutral happy grin laugh smug wink determined angry furious roar shocked scared sad hurt sleepy embarrassed dazed".split(" ");
const WEATHER = "clear overcast fog drizzle rain storm snow blizzard lightning".split(" ");
const TIMES = "day golden dusk night storm".split(" ");
const EMOTIONS = "neutral flat happy excited panic shocked scared sad serious smug angry whisper".split(" ");

const read = (f) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
const errors = [], warnings = [];

// ---- story.md ----
const md = read("docs/story.md");
const front = {};
const fm = /^---\n([\s\S]*?)\n---/.exec(md);
if (fm) for (const line of fm[1].split("\n")) { const m = /^(\w+):\s*(.*)$/.exec(line.trim()); if (m) front[m[1]] = m[2].trim(); }
const [width, height] = (front.size ?? "1080x1920").split("x").map(Number);

const shots = [];
const blocks = md.split(/^### /m).slice(1);
for (const b of blocks) {
  const lines = b.split("\n"), head = lines[0].trim();
  const hm = /^(\S+)\s*[·|\-–]\s*(.+)$/.exec(head);
  if (!hm) { errors.push(`shot heading "${head}" should be "### s01 · location"`); continue; }
  const shot = { id: hm[1], location: hm[2].trim(), narration: "", captions: [] };
  const quote = [];
  for (const l of lines.slice(1)) {
    const q = /^>\s?(.*)$/.exec(l); if (q) { quote.push(q[1].trim()); continue; }
    const kv = /^\s*-\s*(\w+):\s*(.*)$/.exec(l); if (!kv) continue;
    const [, k, v] = kv;
    if (k === "captions") shot.captions = v.split("|").map((c) => c.trim()).filter(Boolean).map((c) => {
      const hot = /\*([^*]+)\*/.exec(c); return { text: c.replace(/\*/g, ""), highlight: hot ? hot[1].replace(/[^A-Z0-9']/gi, "") : "" };
    });
    else if (k === "faces") shot.faces = Object.fromEntries(v.split(/[,;]/).map((p) => p.split("=").map((s) => s.trim())).filter((p) => p.length === 2 && p[0]));
    else if (k === "min") shot.minSeconds = Number(v);
    else shot[k] = v;
  }
  shot.narration = quote.join(" ").trim();
  shots.push(shot);
}

// ---- audio.md ----
const audio = fs.existsSync("docs/audio.md") ? read("docs/audio.md") : "";
const section = (name) => { const m = new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m").exec(audio); return m ? m[1] : ""; };
const bullets = (txt) => Object.fromEntries([...txt.matchAll(/^\s*-\s*([\w-]+):\s*(.+)$/gm)].map((m) => [m[1], m[2].trim()]));
const num = (v) => (v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : undefined);
const vb = bullets(section("Voice"));
const sub = (v) => Object.fromEntries((v ?? "").split(",").map((p) => p.trim().split(/\s+/)).filter((p) => p.length === 2).map(([k, x]) => [k, Number(x)]));
const voice = {
  engine: vb.engine ?? "sapi", gapSeconds: num(vb.gap) ?? 0.15, style: vb.style, rate: vb.rate,
  chatterbox: { voice: vb.voice ?? "am_adam", pitch: num(vb.pitch) ?? 1.35, exaggeration: num(vb.exaggeration) ?? 0.9, cfg: num(vb.cfg) ?? 0.35, tempo: num(vb.tempo) ?? 1, commaPause: num(vb.commaPause) ?? 0.22, stopPause: num(vb.stopPause) ?? 0.4, panic: sub(vb.panic) },
  kokoro: { voice: vb.voice ?? "am_adam", pitch: num(vb.pitch) ?? 1.35, speed: num(vb.speed) ?? 1.0 },
};
const music = Object.entries(bullets(section("Music"))).map(([fromShot, theme]) => ({ theme, fromShot }));

// ---- checks ----
const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9' ]/g, " ").split(/\s+/).filter(Boolean).join(" ");
const ids = new Set();
let words = 0;
for (const s of shots) {
  if (ids.has(s.id)) errors.push(`${s.id}: duplicate shot id`); ids.add(s.id);
  if (s.narration) {
    words += s.narration.split(/\s+/).length;
    const covered = norm(s.captions.map((c) => c.text).join(" "));
    if (covered !== norm(s.narration)) errors.push(`${s.id}: captions "${covered}" do not cover the narration "${norm(s.narration)}"`);
    for (const c of s.captions) { const n = c.text.split(/\s+/).length; if (n > 4) warnings.push(`${s.id}: caption "${c.text}" has ${n} words (2-4 read best)`); }
  } else if (!s.minSeconds) errors.push(`${s.id}: a silent shot needs "- min: <seconds>"`);
  if (!s.camera) warnings.push(`${s.id}: no camera note`);
  if (!s.action) warnings.push(`${s.id}: no action note`);
  for (const [who, face] of Object.entries(s.faces ?? {})) if (!EXPRESSIONS.includes(face)) errors.push(`${s.id}: face "${face}" for ${who} is not a BlockRig expression (${EXPRESSIONS.join(", ")})`);
  for (const part of (s.weather ?? "").split(/->|;/)) { const w = part.trim().split(/\s+/)[0]; if (w && !WEATHER.includes(w)) errors.push(`${s.id}: unknown weather "${w}"`); }
  if (s.emotion && !EMOTIONS.includes(s.emotion)) errors.push(`${s.id}: unknown emotion "${s.emotion}" (${EMOTIONS.join(", ")})`);
  if (s.narration && !s.emotion) warnings.push(`${s.id}: no emotion for the narrator (defaults to ${s.narration.trim().endsWith("!") ? "panic" : "neutral"})`);
  for (const part of (s.time ?? "").split("->")) { const t = part.trim(); if (t && !TIMES.includes(t)) errors.push(`${s.id}: unknown time "${t}"`); }
}
for (const m of music) { if (!ids.has(m.fromShot)) errors.push(`audio.md music: no shot "${m.fromShot}"`); if (!THEME_NAMES.includes(m.theme)) errors.push(`audio.md music: unknown theme "${m.theme}" (${THEME_NAMES.join(", ")})`); }
if (!shots.length) errors.push("docs/story.md has no shots (### s01 · location)");

const story = { $generated: "from docs/ by scripts/docs.mjs - edit the docs, not this file", title: front.title ?? "Untitled", slug: front.slug ?? "video", fps: Number(front.fps ?? 60), width, height, voice, music, shots };
fs.mkdirSync("src/generated", { recursive: true });
fs.writeFileSync("src/generated/story.json", JSON.stringify(story, null, 2) + "\n");
// placeholder timings so a fresh copy renders before any voice exists (npm run voice replaces it)
if (!fs.existsSync("assets/audio/timings.json")) { fs.mkdirSync("assets/audio", { recursive: true }); fs.writeFileSync("assets/audio/timings.json", JSON.stringify({ placeholder: true, clips: {}, music: [], total: 0 })); }

const est = words / 2.7;
console.log(`docs -> ${path.join("src", "generated", "story.json")}: "${story.title}", ${shots.length} shots, ${words} words (~${est.toFixed(1)} s of narration at 2.7 words/s)`);
for (const w of warnings) console.log(`  warning: ${w}`);
for (const e of errors) console.log(`  ERROR: ${e}`);
if (errors.length) process.exit(1);
