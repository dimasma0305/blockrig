// The Remotion bundle, built once and reused by stills, collide and render until the code changes. A bundle takes
// 20-40 s; most runs change no code (a new voice, another still, a re-render). Keyed by a hash of everything that goes
// into it: this video's src/ (story.json and timings.json included), BlockRig's src/, package-lock and the webpack settings. The
// public folder (assets/) is linked (a junction on Windows), not copied, so new audio or textures never need a new bundle.
//   const { serveUrl, hash, reused } = await getBundle()
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { bundle } from "@remotion/bundler";
import { webpackOverride } from "./webpack.mjs";

const CACHE = path.resolve("out/.cache/bundles");
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);

/**
 * Files outside src/ that src/ imports (relative imports such as "../assets/audio/timings.json"): webpack builds them
 * into the bundle, so they belong in its hash. Missed, a re-voice reused a bundle with the old shot timings.
 */
export function importedFromOutside() {
  const out = new Set(), srcDir = path.resolve("src");
  for (const f of walk("src").filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f))) {
    for (const m of fs.readFileSync(f, "utf8").matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
      const p = path.resolve(path.dirname(f), m[1]);
      if (!p.startsWith(srcDir + path.sep) && fs.existsSync(p) && fs.statSync(p).isFile()) out.add(path.relative(process.cwd(), p));
    }
  }
  return [...out];
}

/** The story data the bundle is built with: the shot list and the measured narration. */
export const STORY_DATA = ["src/generated/story.json", "assets/audio/timings.json"];
const same = (a, b) => path.resolve(a) === path.resolve(b);

/**
 * A hash of every file the bundle is built from (contents, so a touch without a change keeps the bundle).
 * `{ data: false }` leaves the story data out: the code hash, which render.mjs keys each shot by together with that
 * shot's own story entry and voice clip, so a re-voiced or rewritten line re-renders that shot only.
 */
export function bundleHash({ data = true } = {}) {
  const files = [...new Set([...walk("src"), ...walk("../../src"), ...importedFromOutside(), "package-lock.json", "package.json", "scripts/webpack.mjs", "remotion.config.ts"])]
    .filter((f) => fs.existsSync(f) && (data || !STORY_DATA.some((d) => same(d, f)))).sort();
  const h = crypto.createHash("sha1");
  for (const f of files) { h.update(f.replace(/\\/g, "/")); h.update(fs.readFileSync(f)); }
  return h.digest("hex").slice(0, 16);
}

export async function getBundle({ log = console.log } = {}) {
  const hash = bundleHash(), outDir = path.join(CACHE, hash);
  if (fs.existsSync(path.join(outDir, "index.html"))) return { serveUrl: outDir, hash, reused: true };
  const t0 = Date.now();
  // Remotion copies the public folder into the bundle on Windows (symlinks elsewhere): replace the copy with a
  // directory junction (no admin rights needed), so a cached bundle always serves the current assets
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("assets"), outDir, symlinkPublicDir: process.platform !== "win32", webpackOverride });
  const pub = path.join(outDir, "public");
  if (fs.existsSync(pub) && !fs.lstatSync(pub).isSymbolicLink()) {
    fs.rmSync(pub, { recursive: true, force: true });
    try { fs.symlinkSync(path.resolve("assets"), pub, "junction"); }
    catch (e) { log(`bundle: could not link assets (${e.message}); copying`); fs.cpSync(path.resolve("assets"), pub, { recursive: true }); }
  }
  log(`bundle: built in ${((Date.now() - t0) / 1000).toFixed(0)} s (${hash})`);
  // keep the 3 newest bundles
  const old = fs.readdirSync(CACHE).map((d) => ({ d, t: fs.statSync(path.join(CACHE, d)).mtimeMs })).sort((a, b) => b.t - a.t).slice(3);
  for (const { d } of old) {
    const link = path.join(CACHE, d, "public");
    if (fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link); // the link only, never assets/
    fs.rmSync(path.join(CACHE, d), { recursive: true, force: true });
  }
  return { serveUrl, hash, reused: false };
}
