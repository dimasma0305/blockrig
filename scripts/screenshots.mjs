// Renders README screenshots into docs/ with a local Chromium-based browser (Edge or Chrome).
//   npm run screenshots                 # uses Edge/Chrome found on this machine
//   CHROME_PATH=/path/to/chrome npm run screenshots
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { serve } from "./serve.mjs";

const SHOTS = [
  { file: "hero", clip: "showtime", t: 0.6, yaw: 0.45, w: 1200, h: 760 },
  { file: "wave", clip: "wave", t: 0.2, yaw: 0.3 },
  { file: "run", clip: "run", t: 0.1, yaw: 1.35 },
  { file: "card", clip: "card", t: 0.62, yaw: 0.55 },
  { file: "victory", clip: "victory", t: 0.4, yaw: 0.25 },
  { file: "showtime", clip: "showtime", t: 0.3, yaw: -0.35 },
  { file: "idle", clip: "idle", t: 1.0, yaw: 2.6 },
];

const candidates = [process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) { console.error("No Chrome/Edge found; set CHROME_PATH"); process.exit(1); }

mkdirSync("docs", { recursive: true });
const server = await serve(8799);
const browser = await chromium.launch({ executablePath, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: s.w || 520, height: s.h || 620 }, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.error(`  ${s.file}: ${e.message}`));
    await page.goto(`http://127.0.0.1:8799/examples/index.html?shot&clip=${s.clip}&t=${s.t}&yaw=${s.yaw}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    await page.locator("canvas").screenshot({ path: `docs/${s.file}.png` });
    console.log(`  docs/${s.file}.png`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
