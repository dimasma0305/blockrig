// Full render to out/<slug>.mp4 (1080x1920, 60 fps, H.264 CRF 18), then a quick ffprobe check.
//   node scripts/render.mjs [--debug]     --debug burns the debug overlay in (for review, never for posting)
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const debug = process.argv.includes("--debug");
const out = `out/${story.slug}${debug ? "-debug" : ""}.mp4`;
const r = spawnSync("npx", ["remotion", "render", "Story", out, "--crf=18", ...(debug ? ["--props={\"debug\":true}"] : [])], { stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) process.exit(r.status ?? 1);
const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate", "-of", "compact", out]).toString();
console.log(probe.trim());
if (!/codec_type=audio/.test(probe)) console.log("warning: no audio stream (run npm run voice)");
console.log(`\n${out}\nNext: pull a frame sheet from the MP4 (see the render skill) and look at it.`);
