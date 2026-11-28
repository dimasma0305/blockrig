// One command for the whole pipeline, and one page to read the result:
//   npm run make                   docs -> (voice, if there is none yet) -> packs (if any) -> check -> stills -> collide -> report
//   npm run make -- --voice        voice every line again first
//   npm run make -- --render       and render the MP4 when nothing is wrong
// out/report.html: what passed, what didn't (with each problem's shot and frames), what needs the user (a sign-in,
// a missing asset), the pace and pitch notes, the contact sheet and every shot's still. Open it after every run.
// Exit code 1 when a step finds problems (the render is skipped then).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2), want = (f) => args.includes(f);
const steps = [], started = Date.now();

function run(name, script, extra = [], { optional = false } = {}) {
  const t0 = Date.now();
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(["npm", "run", script, "--", ...extra].join(" "), { encoding: "utf8", shell: true, maxBuffer: 1e8 }); // one command line (no argument list with a shell)
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const lines = out.split(/\r?\n/).filter((l) => l && !/X4122|X3577|X3595|three\.core\.js|THREE\.Clock|^\s*>|^\[3\dm\(/.test(l));
  process.stdout.write(lines.slice(-12).join("\n") + "\n");
  const step = { name, ok: r.status === 0, optional, seconds: (Date.now() - t0) / 1000, lines };
  steps.push(step);
  return step;
}

run("docs", "docs");
const timings = fs.existsSync("assets/audio/timings.json") ? JSON.parse(fs.readFileSync("assets/audio/timings.json", "utf8")) : { placeholder: true };
if (want("--voice") || timings.placeholder) run("voice", "voice");
const manifest = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));
if (Object.keys(manifest.packs ?? {}).length) {
  // packs: only what the cache can fill on its own (no waiting for the browser here)
  const packsReady = fs.existsSync("assets/roblox/packs/index.json") && Object.keys(manifest.packs).every((k) => JSON.parse(fs.readFileSync("assets/roblox/packs/index.json", "utf8"))[k]);
  steps.push({ name: "packs", ok: packsReady, optional: true, seconds: 0, lines: [packsReady ? `ready: ${Object.keys(manifest.packs).join(", ")}` : "some packs are not downloaded: run npm run pack (it needs the signed-in browser)"] });
}
const check = run("check", "check");
const stills = run("stills", "stills");
const collide = run("collide", "collide");
const problems = steps.filter((s) => !s.ok && !s.optional);
if (want("--render") && !problems.length) run("render", "render");

// ---- the report
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const story = JSON.parse(fs.readFileSync("src/generated/story.json", "utf8"));
const collideJson = fs.existsSync("out/collide.json") ? JSON.parse(fs.readFileSync("out/collide.json", "utf8")) : null;
const notes = check.lines.filter((l) => /note:/.test(l)).map((l) => l.replace(/^\s*note:\s*/, ""));
const checkProblems = check.lines.filter((l) => /PROBLEM:/.test(l)).map((l) => l.replace(/^\s*PROBLEM:\s*/, ""));
const needsUser = [...steps.filter((s) => s.optional && !s.ok).flatMap((s) => s.lines), ...steps.flatMap((s) => s.lines.filter((l) => /sign in|Authentication|npm run pack|npm run roblox/.test(l)))];
const stillFiles = fs.existsSync("out/stills") ? fs.readdirSync("out/stills").filter((f) => /^s\d+.*\.jpg$/.test(f) && !f.includes("@")).sort() : [];
const shotOf = (f) => story.shots.find((s) => s.id === f.replace(/\.jpg$/, ""));
const html = `<!doctype html><meta charset="utf-8"><title>${esc(story.title)}: report</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:24px;max-width:1200px;color:#1b1b1f}h1{margin:0 0 4px}.ok{color:#1a7f37}.bad{color:#cf222e}.warn{color:#9a6700}
table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.grid{display:flex;flex-wrap:wrap;gap:10px}
.grid figure{margin:0;width:180px}.grid img{width:180px;border-radius:6px}.grid figcaption{font-size:12px;color:#555}img.sheet{max-width:100%;border-radius:8px}code{background:#f3f3f3;padding:1px 4px;border-radius:4px}</style>
<h1>${esc(story.title)}</h1><p>${story.shots.length} shots · made ${new Date().toLocaleString()} in ${((Date.now() - started) / 1000).toFixed(0)} s ·
<b class="${problems.length ? "bad" : "ok"}">${problems.length ? `${problems.length} step(s) found problems` : "everything passed"}</b></p>
<h2>Steps</h2><table>${steps.map((s) => `<tr><td>${esc(s.name)}</td><td class="${s.ok ? "ok" : s.optional ? "warn" : "bad"}">${s.ok ? "passed" : s.optional ? "needs you" : "problems"}</td><td>${s.seconds.toFixed(0)} s</td></tr>`).join("")}</table>
${needsUser.length ? `<h2 class="warn">Needs you</h2><ul>${[...new Set(needsUser)].map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
<h2>Voice and pace</h2>${checkProblems.length ? `<ul class="bad">${checkProblems.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p class="ok">npm run check passed</p>`}<ul>${notes.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<h2>Staging (npm run collide)</h2>${collideJson ? (collideJson.problems.length ? `<table><tr><th>shot</th><th>problem</th><th>frames</th></tr>${collideJson.problems.map((p) => `<tr><td>${esc(p.shot)}</td><td>${esc(p.kind)}: ${esc(p.who)} / ${esc(p.what)}${p.worst != null ? ` (${p.worst})` : ""}</td><td>${p.first}-${p.last}</td></tr>`).join("")}</table><p>Check one with <code>npm run stills -- &lt;shot&gt;@&lt;0..1&gt;</code>.</p>` : `<p class="ok">${collideJson.frames} frames, nothing found</p>`) : "<p>not run</p>"}
<h2>Contact sheet</h2>${fs.existsSync("out/contact-sheet.jpg") ? `<img class="sheet" src="contact-sheet.jpg">` : "<p>none</p>"}
<h2>Shots</h2><div class="grid">${stillFiles.map((f) => { const s = shotOf(f); return `<figure><img src="stills/${f}"><figcaption><b>${esc(f.replace(/\.jpg$/, ""))}</b> ${esc(s?.narration ?? "")}<br>${esc(s?.camera ?? "")}</figcaption></figure>`; }).join("")}</div>`;
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/report.html", html);
console.log(`\nreport: ${path.resolve("out/report.html")}${problems.length ? `  (${problems.map((s) => s.name).join(", ")} found problems)` : "  (everything passed)"}`);
if (problems.length) process.exit(1);
