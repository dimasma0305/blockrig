// Render stills before a full render: one per shot (at 60% through it, half scale) into out/stills/, tiled into
// out/contact-sheet.jpg. Look at the sheet before every full render.
//   node scripts/stills.mjs              every shot
//   node scripts/stills.mjs s03 s05      only these shots (no sheet)
//   node scripts/stills.mjs s03@0.2      a shot at 20% through it
//   node scripts/stills.mjs --comp Lineup   frame 0 of another composition (Lineup, MaterialBoard, WeatherLab...)
//   DEBUG=1 node scripts/stills.mjs      with the debug overlay (shot notes, caption band, app zones)
//   ROBLOX=1 node scripts/stills.mjs     with the local Roblox items (assets/roblox; never publish)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, ensureBrowser } from "@remotion/renderer";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const timings = JSON.parse(fs.readFileSync("assets/audio/timings.json", "utf8"));
const gap = story.voice?.gapSeconds ?? 0.12;
let t = 0;
const shots = story.shots.map((s) => {
  const est = s.narration ? s.narration.split(/\s+/).filter(Boolean).length / 2.7 : 0;
  const d = Math.max((timings.clips?.[s.id]?.duration ?? est) + gap, s.minSeconds ?? 0, 0.5);
  const r = { id: s.id, start: t, dur: d }; t += d; return r;
});
const args = process.argv.slice(2), ci = args.indexOf("--comp"), compId = ci >= 0 ? args[ci + 1] : "Story";
const only = args.filter((a, i) => !a.startsWith("--") && !(ci >= 0 && i === ci + 1));
const inputProps = { debug: !!process.env.DEBUG, roblox: !!process.env.ROBLOX };

const browserExecutable = fs.existsSync(".browser-path") ? fs.readFileSync(".browser-path", "utf8").trim() : null;
await ensureBrowser({ browserExecutable });
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("assets"),
  webpackOverride: (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), three: path.resolve("node_modules/three") } } }),
});
const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable, chromiumOptions, inputProps });
fs.mkdirSync("out/stills", { recursive: true });
const still = async (name, frame) => {
  const output = `out/stills/${name}.jpg`;
  await renderStill({ composition, serveUrl, output, frame, scale: 0.5, imageFormat: "jpeg", jpegQuality: 88, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 180000,
    onBrowserLog: (l) => { if (l.type === "error" || process.env.LOGS) console.log(`  [browser ${l.type}] ${l.text.slice(0, 400)}`); } });
  console.log(`${output} (frame ${frame})`);
  return output;
};

// other compositions: the frames given (`--comp MapLab 0 70 130`), frame 0 by default
if (compId !== "Story") { for (const f of only.length ? only : ["0"]) await still(only.length > 1 ? `${compId}-${f}` : compId, Math.min(composition.durationInFrames - 1, Number(f))); process.exit(0); }
const picks = only.length ? only.map((a) => { const [id, at] = a.split("@"); return { s: shots.find((x) => x.id === id), at: at ? Number(at) : 0.6 }; }).filter((p) => p.s) : shots.map((s) => ({ s, at: 0.6 }));
const files = [];
for (const { s, at } of picks) files.push(await still(only.length && at !== 0.6 ? `${s.id}@${at}` : s.id, Math.min(composition.durationInFrames - 1, Math.round((s.start + s.dur * at) * composition.fps))));
if (!only.length) {
  const cols = Math.min(7, files.length);
  execFileSync("ffmpeg", ["-y", "-v", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
    files.length === 1 ? "[0:v]scale=270:-1" : `${files.map((_, i) => `[${i}:v]scale=270:-1[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join("|")}`,
    "out/contact-sheet.jpg"]);
  console.log("out/contact-sheet.jpg");
}
