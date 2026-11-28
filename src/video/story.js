// The story documents (docs/story.md + docs/audio.md, the source of truth a video is written in) compiled into the
// story object the timeline, the voice and the scene read, with the checks that catch a broken shot list before any
// voice or render time is spent. Fixes from the logs: captions that don't cover the narration, captions too long to
// read (2-4 words read best), `say:` pronunciations that change the word count (captions drift), silent beats with
// no length, unknown faces / weather / times / emotions / lighting presets / music themes. BlockRig extra.
//
//   const { story, errors, warnings } = compileStory(read("docs/story.md"), read("docs/audio.md"), { themes })
//
// story.md: front matter (title, slug, fps, size), then one block per shot:
//   ### s01 · street
//   > In this town, it rains every night.
//   - captions: In this *town* | it rains | every night
//   - camera: crane down   - action: ...   - emotion: flat   - speaker: mom   - say: ...   - min: 2   - faces: me=scared
// audio.md: "## Voice" (engine, voice, pitch, gap, tempo, exaggeration, cfg, commaPause, stopPause, panic),
//           "## Voices" (- mom: af_heart 1.0), "## Music" (- s01: goofy-piano).
import { FACS_EXPRESSIONS } from "../facs.js";
import { EMOTION_NAMES } from "../voice/takes.js";
import { TIMES } from "./lighting.js";

export const WEATHER_NAMES = ["clear", "overcast", "fog", "drizzle", "rain", "storm", "snow", "blizzard", "lightning"];
export const LIGHT_PRESET_NAMES = ["day", "golden", "night", "indoor", "studio"];

const clean = (s) => (s ?? "").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

/** docs/story.md -> `{ front, shots, errors }`. */
export function parseStory(md) {
  md = clean(md);
  const front = {}, shots = [], errors = [];
  const fm = /^---\n([\s\S]*?)\n---/.exec(md);
  if (fm) for (const line of fm[1].split("\n")) { const m = /^(\w+):\s*(.*)$/.exec(line.trim()); if (m) front[m[1]] = m[2].trim(); }
  for (const b of md.split(/^### /m).slice(1)) {
    const lines = b.split("\n"), head = lines[0].trim(), hm = /^(\S+)\s*[·|\-–]\s*(.+)$/.exec(head);
    if (!hm) { errors.push(`shot heading "${head}" should be "### s01 · location"`); continue; }
    const shot = { id: hm[1], location: hm[2].trim(), narration: "", captions: [] }, quote = [];
    for (const l of lines.slice(1)) {
      const q = /^>\s?(.*)$/.exec(l); if (q) { quote.push(q[1].trim()); continue; }
      const kv = /^\s*-\s*(\w+):\s*(.*)$/.exec(l); if (!kv) continue;
      const [, k, v] = kv;
      if (k === "captions") shot.captions = v.split("|").map((c) => c.trim()).filter(Boolean).map((c) => { const hot = /\*([^*]+)\*/.exec(c); return { text: c.replace(/\*/g, ""), highlight: hot ? hot[1].replace(/[^A-Z0-9']/gi, "") : "" }; });
      else if (k === "faces") shot.faces = Object.fromEntries(v.split(/[,;]/).map((p) => p.split("=").map((s) => s.trim())).filter((p) => p.length === 2 && p[0]));
      else if (k === "min") shot.minSeconds = Number(v);
      else shot[k] = v;
    }
    shot.narration = quote.join(" ").trim();
    shots.push(shot);
  }
  return { front, shots, errors };
}

/** docs/audio.md -> `{ voice, music }` with the defaults every video starts from (one narrator: am_adam x1.35). */
export function parseAudio(md) {
  md = clean(md);
  const section = (name) => { const m = new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m").exec(md); return m ? m[1] : ""; };
  const bullets = (txt) => Object.fromEntries([...txt.matchAll(/^\s*-\s*([\w-]+):\s*(.+)$/gm)].map((m) => [m[1], m[2].trim()]));
  const num = (v) => (v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : undefined);
  const sub = (v) => Object.fromEntries((v ?? "").split(",").map((p) => p.trim().split(/\s+/)).filter((p) => p.length === 2).map(([k, x]) => [k, Number(x)]));
  const vb = bullets(section("Voice"));
  const voice = {
    engine: vb.engine ?? "sapi", gapSeconds: num(vb.gap) ?? 0.15, style: vb.style, rate: vb.rate,
    chatterbox: { voice: vb.voice ?? "am_adam", pitch: num(vb.pitch) ?? 1.35, exaggeration: num(vb.exaggeration) ?? 0.9, cfg: num(vb.cfg) ?? 0.35, tempo: num(vb.tempo) ?? 1, commaPause: num(vb.commaPause) ?? 0.22, stopPause: num(vb.stopPause) ?? 0.4, panic: sub(vb.panic) },
    kokoro: { voice: vb.voice ?? "am_adam", pitch: num(vb.pitch) ?? 1.35, speed: num(vb.speed) ?? 1.0 },
  };
  // "## Voices": a voice sample per dialogue speaker ("- mom: af_heart 1.0" = Kokoro voice, pitch)
  voice.chatterbox.voices = Object.fromEntries(Object.entries(bullets(section("Voices"))).map(([who, v]) => { const [kv, p] = v.split(/\s+/); return [who, { voice: kv, pitch: Number(p ?? 1) }]; }));
  const music = Object.entries(bullets(section("Music"))).map(([fromShot, theme]) => ({ theme, fromShot }));
  return { voice, music };
}

/**
 * Check a story: `{ errors, warnings, words }`. Names a video can extend: `expressions` (dynamic-head expressions, FACS_EXPRESSIONS),
 * `weather`, `times` (TIMES), `emotions` (blockrig/voice), `lights` (lighting presets), `themes` (music; unchecked if
 * not given). `none` is always a valid music theme (silence).
 */
export function checkStory(story, o = {}) {
  const expressions = o.expressions ?? Object.keys(FACS_EXPRESSIONS), weather = o.weather ?? WEATHER_NAMES, times = o.times ?? Object.keys(TIMES);
  const emotions = o.emotions ?? EMOTION_NAMES, lights = o.lights ?? LIGHT_PRESET_NAMES, themes = o.themes;
  const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9' ]/g, " ").split(/\s+/).filter(Boolean).join(" ");
  const errors = [], warnings = [], ids = new Set();
  let total = 0;
  for (const s of story.shots) {
    if (ids.has(s.id)) errors.push(`${s.id}: duplicate shot id`); ids.add(s.id);
    if (s.narration) {
      total += words(s.narration);
      const covered = norm((s.captions ?? []).map((c) => c.text).join(" "));
      if (covered !== norm(s.narration)) errors.push(`${s.id}: captions "${covered}" do not cover the narration "${norm(s.narration)}"`);
      for (const c of s.captions ?? []) { const n = words(c.text); if (n > 4) warnings.push(`${s.id}: caption "${c.text}" has ${n} words (2-4 read best)`); }
      // "- say:" is how the narrator pronounces the line (names); it must keep the word count so captions stay in step
      if (s.say && words(s.say) !== words(s.narration)) errors.push(`${s.id}: "say" has ${words(s.say)} words, the line ${words(s.narration)}`);
      if (!s.emotion) warnings.push(`${s.id}: no emotion for the narrator (defaults to ${s.narration.trim().endsWith("!") ? "panic" : "neutral"})`);
    } else if (!s.minSeconds) errors.push(`${s.id}: a silent shot needs "- min: <seconds>"`);
    if (!s.camera) warnings.push(`${s.id}: no camera note`);
    if (!s.action) warnings.push(`${s.id}: no action note`);
    if (s.light && !lights.includes(s.light)) errors.push(`${s.id}: light "${s.light}" is not a lighting preset (${lights.join(", ")}; leave it out for the sky's own light)`);
    for (const [who, face] of Object.entries(s.faces ?? {})) if (!expressions.includes(face)) errors.push(`${s.id}: face "${face}" for ${who} is not a face expression (${expressions.join(", ")})`);
    for (const part of (s.weather ?? "").split(/->|;/)) { const w = part.trim().split(/\s+/)[0]; if (w && !weather.includes(w)) errors.push(`${s.id}: unknown weather "${w}"`); }
    if (s.emotion && !emotions.includes(s.emotion)) errors.push(`${s.id}: unknown emotion "${s.emotion}" (${emotions.join(", ")})`);
    for (const part of (s.time ?? "").split("->")) { const t = part.trim(); if (t && !times.includes(t)) errors.push(`${s.id}: unknown time "${t}"`); }
  }
  for (const m of story.music ?? []) {
    if (!ids.has(m.fromShot)) errors.push(`audio.md music: no shot "${m.fromShot}"`);
    if (themes && !themes.includes(m.theme) && m.theme !== "none") errors.push(`audio.md music: unknown theme "${m.theme}" (${themes.join(", ")}, none)`);
  }
  if (!story.shots.length) errors.push("docs/story.md has no shots (### s01 · location)");
  return { errors, warnings, words: total };
}

/** Both documents -> `{ story, errors, warnings }` (the story object createTimeline and the voice scripts read). */
export function compileStory(storyMd, audioMd = "", o = {}) {
  const { front, shots, errors: parseErrors } = parseStory(storyMd), { voice, music } = parseAudio(audioMd);
  const [width, height] = (front.size ?? "1080x1920").split("x").map(Number);
  const story = { title: front.title ?? "Untitled", slug: front.slug ?? "video", fps: Number(front.fps ?? 60), width, height, voice, music, shots };
  const { errors, warnings, words: w } = checkStory(story, o);
  return { story, errors: [...parseErrors, ...errors], warnings, words: w };
}
