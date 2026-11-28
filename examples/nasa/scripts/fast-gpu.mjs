// Render on the fast GPU (Windows laptops with two GPUs). Headless Chrome, which Remotion renders with, starts on the
// power-saving integrated GPU; on a laptop with an RTX 4060 that made renders about 4x slower. This sets the
// per-app Windows graphics preference ("High performance", the same as Settings > System > Display > Graphics) for
// this project's render browser, under the current user only. Undo it in that Settings page.
//   npm run fast-gpu
// Then `npm run stills -- s01` with LOGS=1 prints the GPU each render tab uses ("GPU ANGLE (NVIDIA ...").
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

if (process.platform !== "win32") { console.log("Only needed on Windows (macOS and Linux pick the GPU themselves)."); process.exit(0); }
const root = path.resolve("node_modules/.remotion/chrome-headless-shell");
const find = (dir) => { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? find(path.join(dir, e.name)) : e.name === "chrome-headless-shell.exe" ? [path.join(dir, e.name)] : []); };
const exes = find(root);
if (!exes.length) { console.log("No render browser yet: run `npm run stills -- s01` once (Remotion downloads it), then this again."); process.exit(1); }
for (const exe of exes) {
  execFileSync("reg", ["add", "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences", "/v", exe, "/t", "REG_SZ", "/d", "GpuPreference=2;", "/f"], { stdio: "ignore" });
  console.log(`High performance GPU: ${exe}`);
}
