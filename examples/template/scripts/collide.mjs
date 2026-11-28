// Collision check (Rapier): renders every Nth frame small and fast with { collide: true }; the scene logs what it
// finds (src/kit/collide.ts) and this prints one line per problem with the shot and frames it spans.
//   node scripts/collide.mjs              every 6th frame, the public version
//   node scripts/collide.mjs --no-roblox  without the Roblox items and maps (used by default once downloaded)
//   node scripts/collide.mjs --every 2    denser sampling
// Writes out/collide.json. Exit code 1 when something is found, so it can gate a render.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition, ensureBrowser } from "@remotion/renderer";

const args = process.argv.slice(2), roblox = !args.includes("--no-roblox") && fs.existsSync("assets/roblox/cast.json"), ei = args.indexOf("--every"), every = ei >= 0 ? Number(args[ei + 1]) : 6;
const inputProps = { collide: true, roblox, debug: false };
const browserExecutable = fs.existsSync(".browser-path") ? fs.readFileSync(".browser-path", "utf8").trim() : null;
await ensureBrowser({ browserExecutable });
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("assets"),
  webpackOverride: (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), three: path.resolve("node_modules/three") } } }),
});
const chromiumOptions = { gl: "angle" };
const composition = await selectComposition({ serveUrl, id: "Story", browserExecutable, chromiumOptions, inputProps });
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "collide-"));
const frames = new Map();
let errors = 0;
await renderFrames({
  composition, serveUrl, inputProps, outputDir, browserExecutable, chromiumOptions, everyNthFrame: every, imageFormat: "jpeg", jpegQuality: 30, scale: 0.15, muted: true, // no audio: only the logs matter
  concurrency: Math.max(1, Math.min(4, os.cpus().length >> 1)), timeoutInMilliseconds: 180000,
  onStart: ({ frameCount }) => console.log(`checking ${frameCount} frames (every ${every}th)${roblox ? " with the Roblox items" : ""}...`),
  onFrameUpdate: () => {},
  onBrowserLog: (l) => {
    if (l.text.startsWith("COLLIDE ")) { const r = JSON.parse(l.text.slice(8)); frames.set(r.frame, r); }
    else if (l.type === "error") { errors++; if (errors < 5) console.log(`  [browser error] ${l.text.slice(0, 300)}`); }
  },
});
fs.rmSync(outputDir, { recursive: true, force: true });

// group: one line per (shot, kind, who, what) with its frame span and worst amount
const groups = new Map();
for (const r of [...frames.values()].sort((a, b) => a.frame - b.frame)) for (const i of r.issues) {
  const key = [r.shot, i.kind, i.who, i.what].join("|");
  const g = groups.get(key) ?? { shot: r.shot, ...i, first: r.frame, last: r.frame, count: 0, worst: i.amount ?? 0 };
  g.last = r.frame; g.count++; g.worst = Math.max(g.worst, i.amount ?? 0); groups.set(key, g);
}
const fps = composition.fps, sec = (f) => (f / fps).toFixed(2);
const say = {
  "camera-inside": (g) => `camera is inside ${g.what}`,
  hidden: (g) => `${g.who}'s face is hidden by ${g.what}`,
  inside: (g) => `${g.who} is inside ${g.what}`,
  floating: (g) => `${g.who} floats ${g.worst} studs above ${g.what}`,
  sunk: (g) => `${g.who} is sunk ${g.worst} studs into ${g.what}`,
  stiff: (g) => `${g.who} rests on top of ${g.what} without sinking in (it is soft: ~${g.worst} studs, use restOn())`,
  overlap: (g) => `${g.who} and ${g.what} stand inside each other`,
  "caption-over-face": (g) => `${g.who}'s face is behind the captions (at ${Math.round(g.worst * 100)}% of the frame height): aim lower or keep the face in the upper half`,
};
const describe = (g) => (say[g.kind] ?? ((x) => `${x.kind}: ${x.who} / ${x.what}`))(g);
const list = [...groups.values()];
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/collide.json", JSON.stringify({ every, roblox, frames: frames.size, problems: list }, null, 1));
if (!frames.size) { console.log("no frames reported: is the probe wired into Video.tsx (collide prop)?"); process.exit(2); }
if (!list.length) { console.log(`collide: ${frames.size} frames, nothing found`); process.exit(0); }
for (const g of list) console.log(`${g.shot}  ${describe(g)}  (frames ${g.first}-${g.last}, ${sec(g.first)}-${sec(g.last)} s, ${g.count}x)`);
console.log(`collide: ${list.length} problem(s) in ${frames.size} frames -> out/collide.json. Check each with: npm run stills -- <shot>@<0..1>`);
process.exit(1);
