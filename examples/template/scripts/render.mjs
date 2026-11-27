// Full render to out/<slug>.mp4 (1080x1920, 60 fps, H.264 CRF 18), then a quick ffprobe check.
//   node scripts/render.mjs [--debug] [--no-roblox]
//     --debug   burns the debug overlay in (for review, never for posting)
//     --no-roblox  without Roblox items (they are used by default once npm run roblox downloaded them)
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
// Roblox items are used whenever they are downloaded (npm run roblox); --no-roblox renders an all-original/CC0 cut
const debug = process.argv.includes("--debug"), roblox = !process.argv.includes("--no-roblox") && fs.existsSync("assets/roblox/cast.json");
const out = `out/${story.slug}${roblox ? "" : "-cc0"}${debug ? "-debug" : ""}.mp4`;
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/props.json", JSON.stringify({ debug, roblox })); // a file: JSON on a Windows command line is fragile
const r = spawnSync("npx", ["remotion", "render", "Story", out, "--crf=18", "--props=out/props.json"], { stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) process.exit(r.status ?? 1);
const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate", "-of", "compact", out]).toString();
console.log(probe.trim());
if (!/codec_type=audio/.test(probe)) console.log("warning: no audio stream (run npm run voice)");
if (roblox) console.log("Uses Roblox items (allowed in videos, monetized too). Keep assets/roblox out of git.");
console.log(`\n${out}\nNext: pull a frame sheet from the MP4 (see the render skill) and look at it.`);
