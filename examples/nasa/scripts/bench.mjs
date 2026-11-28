// Render-speed benchmark: renders the same frames under different settings and prints frames per second after the
// tabs have started (startup is printed apart). For tuning renders, not part of the pipeline.
//   node scripts/bench.mjs [from] [count]       default: 120 frames from frame 600
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { selectComposition, renderFrames, ensureBrowser } from "@remotion/renderer";
import { getBundle } from "./bundle.mjs";

const from = Number(process.argv[2] ?? 600), count = Number(process.argv[3] ?? 120);
const { serveUrl } = await getBundle();
const browserExecutable = fs.existsSync(".browser-path") ? fs.readFileSync(".browser-path", "utf8").trim() : null;
await ensureBrowser({ browserExecutable });
const chromiumOptions = { gl: "angle" };
const roblox = fs.existsSync("assets/roblox/cast.json");
const variants = (process.env.VARIANTS ?? "base,nopost,c4,c12,q80").split(",");
const V = { base: {}, nopost: { props: { post: false } }, c4: { concurrency: 4 }, c6: { concurrency: 6 }, c12: { concurrency: 12 }, c16: { concurrency: 16 }, q80: { quality: 80 }, png: { format: "png" } };
for (const name of variants) {
  const v = V[name]; const inputProps = { roblox, debug: false, ...(v.props ?? {}) };
  const composition = await selectComposition({ serveUrl, id: "Story", browserExecutable, chromiumOptions, inputProps });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-"));
  const t0 = Date.now(); let first = 0;
  await renderFrames({ composition, serveUrl, inputProps, outputDir: dir, frameRange: [from, from + count - 1], imageFormat: v.format ?? "jpeg", jpegQuality: v.quality ?? 95, concurrency: v.concurrency ?? 8,
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onStart: () => {}, onFrameUpdate: (done) => { if (done === 1) first = Date.now(); } });
  const t1 = Date.now();
  console.log(`${name.padEnd(7)} startup ${((first - t0) / 1000).toFixed(1)} s, then ${((count - 1) / ((t1 - first) / 1000)).toFixed(2)} frames/s (${((t1 - t0) / 1000).toFixed(1)} s total)`);
  fs.rmSync(dir, { recursive: true, force: true });
}
