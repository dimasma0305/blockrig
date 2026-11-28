// Install the offline voices into one Python environment (~/.venvs/blockrig-voice), outside the project:
//   - Kokoro (open TTS model, Apache 2.0, ~340 MB of model files in ~/.cache/kokoro)
//   - faster-whisper (checks every take says the right words, and times the captions)
//   - Chatterbox (expressive TTS, MIT) with CUDA torch, only if an NVIDIA GPU is present (~3 GB)
// Needs Python 3.10/3.11 (Chatterbox does not support 3.13 yet) and ffmpeg on the PATH.
//   node scripts/setup-voice.mjs [--no-chatterbox]
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const win = process.platform === "win32", home = process.env.USERPROFILE || process.env.HOME;
const venv = path.join(home, ".venvs", "blockrig-voice"), vpy = path.join(venv, win ? "Scripts/python.exe" : "bin/python");
const run = (cmd, args) => { console.log(`> ${cmd} ${args.join(" ")}`); execFileSync(cmd, args, { stdio: "inherit" }); };
const ok = (cmd, args) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;

if (!ok("ffmpeg", ["-version"])) { console.error("ffmpeg is not on the PATH: install it first (winget install ffmpeg / brew install ffmpeg)."); process.exit(1); }
if (!fs.existsSync(vpy)) {
  const pick = win ? ["3.11", "3.10"].find((v) => ok("py", [`-${v}`, "--version"])) : ["python3.11", "python3.10"].find((p) => ok(p, ["--version"]));
  if (!pick) { console.error("Python 3.11 or 3.10 is needed (Chatterbox does not run on 3.13 yet)."); process.exit(1); }
  win ? run("py", [`-${pick}`, "-m", "venv", venv]) : run(pick, ["-m", "venv", venv]);
}
run(vpy, ["-m", "pip", "install", "-q", "--upgrade", "pip"]);
const gpu = ok("nvidia-smi", []) && !process.argv.includes("--no-chatterbox");
if (gpu) {
  run(vpy, ["-m", "pip", "install", "-q", "torch==2.6.0", "torchaudio==2.6.0", "--index-url", "https://download.pytorch.org/whl/cu124"]);
  run(vpy, ["-m", "pip", "install", "-q", "chatterbox-tts"]);
}
run(vpy, ["-m", "pip", "install", "-q", "kokoro-onnx", "soundfile", "faster-whisper"]);
if (gpu) run(vpy, ["-m", "pip", "install", "-q", "numpy<2"]); // chatterbox needs numpy 1.x; kokoro works with it

const kdir = process.env.KOKORO_DIR || path.join(home, ".cache", "kokoro");
fs.mkdirSync(kdir, { recursive: true });
for (const f of ["kokoro-v1.0.onnx", "voices-v1.0.bin"]) {
  const out = path.join(kdir, f);
  if (fs.existsSync(out)) continue;
  console.log(`downloading ${f}`);
  const r = await fetch(`https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/${f}`);
  if (!r.ok) throw new Error(`${r.status} ${f}`);
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}
console.log(`\nvoice ready: ${vpy}\n  engines: kokoro${gpu ? ", chatterbox" : " (no NVIDIA GPU: chatterbox skipped)"}\n  set "engine:" in docs/audio.md, then npm run voice`);
