// Make the README copies of the finished video:
//   ../../docs/ctf.mp4          720x1280, small enough to keep in git, with sound
//   ../../docs/ctf-preview.gif  a short looping clip for the README (GitHub shows GIFs inline, not repo MP4s)
//   node scripts/preview.mjs [startSeconds] [lengthSeconds]
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const src = "out/ctf.mp4";
if (!fs.existsSync(src)) { console.error("render first: npm run render"); process.exit(1); }
const start = process.argv[2] ?? "0", len = process.argv[3] ?? "9";
const docs = "../../docs";
fs.mkdirSync(docs, { recursive: true });
const ff = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });

ff(["-i", src, "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", `${docs}/ctf.mp4`]);
ff(["-ss", start, "-t", len, "-i", src, "-filter_complex",
  "fps=12,scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
  "-loop", "0", `${docs}/ctf-preview.gif`]);
for (const f of ["ctf.mp4", "ctf-preview.gif"]) console.log(`${docs}/${f}  ${(fs.statSync(`${docs}/${f}`).size / 1e6).toFixed(2)} MB`);
