// Small copies of the finished video for a README or sharing:
//   <dir>/<slug>.mp4          720x1280 with sound, small enough for git
//   <dir>/<slug>-preview.gif  a short loop (GitHub shows GIFs inline, not MP4s from the repo)
//   node scripts/preview.mjs [--to <dir>] [--start <s>] [--len <s>]     default dir: out/preview
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const src = `out/${story.slug}.mp4`, dir = arg("--to", "out/preview"), start = arg("--start", "0"), len = arg("--len", "9");
if (!fs.existsSync(src)) { console.error("render first: npm run render"); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const ff = (a) => execFileSync("ffmpeg", ["-y", "-v", "error", ...a], { stdio: "inherit" });
ff(["-i", src, "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", `${dir}/${story.slug}.mp4`]);
ff(["-ss", start, "-t", len, "-i", src, "-filter_complex", "fps=12,scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4", "-loop", "0", `${dir}/${story.slug}-preview.gif`]);
for (const f of [`${story.slug}.mp4`, `${story.slug}-preview.gif`]) console.log(`${dir}/${f}  ${(fs.statSync(`${dir}/${f}`).size / 1e6).toFixed(2)} MB`);
