// Full render to out/<slug>.mp4 (1080x1920, 60 fps, H.264 CRF 18), with caching so a re-render only redoes what changed:
//   - the bundle is reused until the code changes (scripts/bundle.mjs);
//   - every shot is rendered into its own video segment, cached under out/.cache/shots by a key made of the bundle,
//     the shot's frame range, the assets it can see and the render settings: an unchanged shot is never rendered twice;
//   - the soundtrack is mixed by ffmpeg (no browser) once per voice / music change;
//   - the final MP4 is the cached segments joined without re-encoding, plus the soundtrack (seconds).
//   node scripts/render.mjs [--debug] [--no-roblox] [--only s03,s05] [--fresh]
//     --only s03,s05  re-render just these shots, and reuse every other shot's latest segment even if the code
//                     changed (when you know your change only touched these shots)
//     --fresh         ignore the cache
//     --debug         burns the debug overlay in (for review, never for posting)
//     --no-roblox     without Roblox items (they are used by default once npm run roblox downloaded them)
// Prints where the time went (bundle, each render run in frames per second, audio, join).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { selectComposition, renderFrames, ensureBrowser, openBrowser } from "@remotion/renderer";
import { getBundle } from "./bundle.mjs";

const args = process.argv.slice(2), has = (f) => args.includes(f), after = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const T0 = Date.now(), times = [], lap = (what, t) => times.push(`${what} ${((Date.now() - t) / 1000).toFixed(1)} s`);
const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const debug = has("--debug"), roblox = !has("--no-roblox") && fs.existsSync("assets/roblox/cast.json");
const only = (after("--only") ?? "").split(",").filter(Boolean), fresh = has("--fresh");
const out = `out/${story.slug}${roblox ? "" : "-cc0"}${debug ? "-debug" : ""}.mp4`;
const inputProps = { debug, roblox };
const concurrency = Number(process.env.CONCURRENCY) || 8; // measured fastest on an RTX 4060 laptop (remotion.config.ts)
const CRF = 18, CACHE = path.resolve("out/.cache"), SHOTS = path.join(CACHE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const sha = (...parts) => { const h = crypto.createHash("sha1"); for (const p of parts) h.update(typeof p === "string" ? p : JSON.stringify(p)); return h.digest("hex").slice(0, 16); };

// ---- what the frames depend on besides the code: the assets a frame can show (not the audio), the timings
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
const visualAssets = sha(...walk("assets").filter((f) => !/[\\/]audio[\\/].*\.(wav|mp3|json)$|[\\/]roblox[\\/](locations|needs|pack-links|pack-round)/.test(f)).sort().map((f) => { const s = fs.statSync(f); return `${f}|${s.size}|${s.mtimeMs}`; }));
const audioKey = sha(...walk("assets/audio").sort().map((f) => { const s = fs.statSync(f); return `${f}|${s.size}|${s.mtimeMs}`; }));

let t = Date.now();
const { serveUrl, hash, reused } = await getBundle();
lap(reused ? "bundle (cached)" : "bundle", t);
const browserExecutable = fs.existsSync(".browser-path") ? fs.readFileSync(".browser-path", "utf8").trim() : null;
await ensureBrowser({ browserExecutable });
const chromiumOptions = { gl: "angle" };
// one browser for the whole render: every render run reuses it (and its GPU process), instead of launching its own
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "Story", browserExecutable, chromiumOptions, inputProps, puppeteerInstance: browser });
const fps = composition.fps, total = composition.durationInFrames;

// ---- each shot's frames, as the video's timeline places them (voice lengths + gap, at least `min`)
const timings = JSON.parse(fs.readFileSync("assets/audio/timings.json", "utf8")), gap = story.voice?.gapSeconds ?? 0.12;
let sec = 0;
const shots = story.shots.map((s) => {
  const est = s.narration ? s.narration.split(/\s+/).filter(Boolean).length / 2.7 : 0;
  const d = Math.max((timings.clips?.[s.id]?.duration ?? est) + gap, s.minSeconds ?? 0, 0.5);
  // frame f shows the shot whose [start, end) holds f / fps (the timeline's shotAt): the first frame at or after its start
  const first = (x) => Math.ceil(x * fps - 1e-9);
  const r = { id: s.id, start: first(sec), end: Math.min(total, first(sec + d)) }; sec += d; return r;
}).filter((s) => s.end > s.start);
const settings = { w: composition.width, h: composition.height, fps, CRF, inputProps, v: 3 };
const latestFile = path.join(SHOTS, "latest.json"), latest = fs.existsSync(latestFile) ? JSON.parse(fs.readFileSync(latestFile, "utf8")) : {};
for (const s of shots) {
  s.key = sha(hash, visualAssets, s.id, s.start, s.end, settings);
  s.file = path.join(SHOTS, `${s.key}.mp4`);
  // --only: other shots may reuse their latest segment if it covers the same frames
  const prev = latest[`${s.id}|${JSON.stringify(inputProps)}`];
  if (only.length && !only.includes(s.id) && !fs.existsSync(s.file) && prev && prev.start === s.start && prev.end === s.end && fs.existsSync(prev.file)) { s.file = prev.file; s.reusedOld = true; }
  s.cached = !fresh && !only.includes(s.id) && fs.existsSync(s.file);
}
const todo = shots.filter((s) => !s.cached);
console.log(`${shots.length} shots, ${total} frames: ${shots.length - todo.length} cached${shots.some((s) => s.reusedOld) ? ` (${shots.filter((s) => s.reusedOld).map((s) => s.id).join(", ")} from the last render)` : ""}, ${todo.length} to render`);

// ---- render the missing shots, contiguous ones in one run (each run starts the render tabs once)
const runs = [];
for (const s of todo) { const r = runs.at(-1); if (r && r.at(-1).end === s.start) r.push(s); else runs.push([s]); }
// one shot's frames -> its own H.264 segment: an exact numbered sequence (hard links), so a segment has exactly the
// shot's frames and the segments join back without a dropped or doubled frame
const encodeSegment = (dir, files, outFile) => {
  const seq = fs.mkdtempSync(path.join(dir, "seq-"));
  files.forEach((f, i) => { const to = path.join(seq, `${String(i).padStart(6, "0")}.jpeg`); try { fs.linkSync(f, to); } catch { fs.copyFileSync(f, to); } });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-framerate", String(fps), "-i", path.join(seq, "%06d.jpeg"), "-c:v", "libx264", "-preset", "fast", "-crf", String(CRF), "-pix_fmt", "yuv420p", "-r", String(fps), outFile]);
  fs.rmSync(seq, { recursive: true, force: true });
};
for (const run of runs) {
  const a = run[0].start, b = run.at(-1).end - 1, n = b - a + 1;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "render-"));
  t = Date.now(); let first = 0;
  process.stdout.write(`rendering ${run.map((s) => s.id).join(" ")} (frames ${a}-${b})`);
  await renderFrames({ composition, serveUrl, inputProps, outputDir: dir, frameRange: [a, b], imageFormat: "jpeg", jpegQuality: 95, concurrency, browserExecutable, chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 180000,
    onStart: () => {}, onFrameUpdate: (done) => { if (done === 1) first = Date.now(); if (done % 60 === 0) process.stdout.write("."); } });
  const secs = (Date.now() - t) / 1000;
  console.log(` ${secs.toFixed(0)} s, ${(n / secs).toFixed(1)} frames/s (first frame after ${((first - t) / 1000).toFixed(0)} s: tabs starting)`);
  times.push(`render ${run.map((s) => s.id).join(",")} ${secs.toFixed(1)} s`);
  // frames by number -> one segment per shot
  const frames = new Map(fs.readdirSync(dir).filter((f) => /\.jpe?g$/.test(f)).map((f) => [Number(/(\d+)\.jpe?g$/.exec(f)[1]), path.join(dir, f)]));
  const t2 = Date.now();
  for (const s of run) {
    const files = []; for (let f = s.start; f < s.end; f++) { const p = frames.get(f) ?? frames.get(f - a); if (!p) throw new Error(`frame ${f} missing`); files.push(p); }
    encodeSegment(dir, files, s.file);
    latest[`${s.id}|${JSON.stringify(inputProps)}`] = { file: s.file, start: s.start, end: s.end };
  }
  lap(`encode ${run.length} segment(s)`, t2);
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.writeFileSync(latestFile, JSON.stringify(latest, null, 1));
await browser.close({ silent: true });

// ---- the soundtrack, mixed by ffmpeg from the same timeline the video uses (voice clips on their shots at full
// volume, music sections at 0.2, as blockrig/remotion Soundtrack plays them): no browser, about a second
const audio = path.join(CACHE, `audio-${sha(audioKey, story.shots.map((s) => s.id), total, fps, 2)}.m4a`);
if (!fs.existsSync(audio) || fresh) {
  t = Date.now();
  const inputs = [], parts = [];
  for (const s of shots) {
    const f = path.resolve("assets", `audio/${s.id}.wav`);
    if (!timings.clips?.[s.id] || !fs.existsSync(f)) continue;
    const ms = Math.round((s.start / fps) * 1000), i = inputs.push(f) - 1;
    // the clip plays until its shot's sequence ends (+0.5 s), as the Sequence in Soundtrack does
    parts.push(`[${i}:a]atrim=0:${((s.end - s.start) / fps + 0.5).toFixed(3)},adelay=${ms}|${ms},volume=1[a${i}]`);
  }
  for (const m of timings.music ?? []) {
    if (!m.file) continue;
    const f = path.resolve("assets", m.file); if (!fs.existsSync(f)) continue;
    const ms = Math.round(Math.round(m.from * fps) / fps * 1000), len = Math.max(1, Math.round((m.to - m.from) * fps)) / fps, i = inputs.push(f) - 1;
    parts.push(`[${i}:a]atrim=0:${len.toFixed(3)},adelay=${ms}|${ms},volume=0.2[a${i}]`);
  }
  const length = (total / fps).toFixed(3);
  const graph = inputs.length ? `${parts.join(";")};${inputs.map((_, i) => `[a${i}]`).join("")}amix=inputs=${inputs.length}:normalize=0:dropout_transition=0,apad,atrim=0:${length}[out]`
    : `anullsrc=r=48000:cl=stereo,atrim=0:${length}[out]`;
  execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs.flatMap((f) => ["-i", f]), "-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k", audio]);
  lap("soundtrack", t);
} else times.push("soundtrack (cached)");

// ---- join: the segments as they are (no re-encode) + the soundtrack
t = Date.now();
const list = path.join(CACHE, "segments.txt");
fs.writeFileSync(list, shots.map((s) => `file '${s.file.replace(/\\/g, "/")}'`).join("\n") + "\n");
fs.mkdirSync("out", { recursive: true });
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", out]);
lap("join", t);

// ---- keep the cache from growing without end: segments not used by this render and older than a week
const used = new Set(shots.map((s) => path.resolve(s.file)));
for (const f of fs.readdirSync(SHOTS).filter((f) => f.endsWith(".mp4"))) { const p = path.join(SHOTS, f); if (!used.has(p) && Date.now() - fs.statSync(p).mtimeMs > 7 * 864e5) fs.rmSync(p); }

const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate,nb_frames", "-of", "compact", out]).toString();
console.log(probe.trim());
if (!/codec_type=audio/.test(probe)) console.log("warning: no audio stream (run npm run voice)");
if (roblox) console.log("Uses Roblox items (allowed in videos, monetized too). Keep assets/roblox out of git.");
console.log(`\ntimes: ${times.join(" · ")} · total ${((Date.now() - T0) / 1000).toFixed(0)} s`);
console.log(`${out}\nNext: pull a frame sheet from the MP4 (see the render skill) and look at it.`);
