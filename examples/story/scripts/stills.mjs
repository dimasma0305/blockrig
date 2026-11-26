// Render one still per shot (middle frame, half scale) into out/stills/ and tile them into out/contact-sheet.jpg.
//   node scripts/stills.mjs            # every shot
//   node scripts/stills.mjs s07 s12    # only these shots
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, ensureBrowser } from "@remotion/renderer";

const story = JSON.parse(fs.readFileSync("story.json", "utf8"));
const timings = JSON.parse(fs.readFileSync("public/audio/timings.json", "utf8"));
const gap = story.voice?.gapSeconds ?? 0.12;
let t = 0;
const shots = story.shots.map((s) => { const d = Math.max((timings.clips[s.id]?.duration ?? 0) + gap, s.minSeconds ?? 0); const r = { id: s.id, mid: t + d * 0.6 }; t += d; return r; });
const only = process.argv.slice(2);
const pick = only.length ? shots.filter((s) => only.includes(s.id)) : shots;

const browserExecutable = fs.existsSync(".browser-path") ? fs.readFileSync(".browser-path", "utf8").trim() : null;
await ensureBrowser({ browserExecutable });
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  webpackOverride: (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), three: path.resolve("node_modules/three") } } }),
});
const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id: "Story", browserExecutable, chromiumOptions });
fs.mkdirSync("out/stills", { recursive: true });
for (const s of pick) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s.mid * composition.fps));
  const output = `out/stills/${s.id}.jpg`;
  await renderStill({ composition, serveUrl, output, frame, scale: 0.5, imageFormat: "jpeg", jpegQuality: 88, browserExecutable, chromiumOptions, timeoutInMilliseconds: 120000, onBrowserLog: (l) => { if (l.type === "error" || process.env.LOGS) console.log(`  [browser ${l.type}] ${l.text.slice(0, 400)}`); } });
  console.log(`${output} (frame ${frame})`);
}
if (!only.length) {
  const list = shots.map((s) => `out/stills/${s.id}.jpg`);
  execFileSync("ffmpeg", ["-y", "-v", "error", ...list.flatMap((f) => ["-i", f]), "-filter_complex", `${list.map((_, i) => `[${i}:v]scale=270:-1[v${i}]`).join(";")};${list.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${list.length}:layout=${list.map((_, i) => `${(i % 7) * 270}_${Math.floor(i / 7) * 480}`).join("|")}`, "out/contact-sheet.jpg"]);
  console.log("out/contact-sheet.jpg");
}
