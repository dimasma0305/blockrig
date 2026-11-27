// Start a new video from this template: copies everything except generated and downloaded files.
//   npm run new -- ../my-video "My Video Title"
// Then: cd ../my-video && npm install && edit docs/story.md (see the story skill).
import fs from "node:fs";
import path from "node:path";

const [dest, title = "Untitled"] = process.argv.slice(2);
if (!dest) { console.error('usage: npm run new -- <folder> "Title"'); process.exit(1); }
const to = path.resolve(dest);
if (fs.existsSync(to) && fs.readdirSync(to).length) { console.error(`${to} is not empty`); process.exit(1); }
const skip = new Set(["node_modules", "out", "generated", ".browser-path"]);
const skipUnder = ["assets/audio", "assets/roblox", "assets/cc0", "assets/textures"].map((p) => path.normalize(p));
const from = process.cwd();
function copy(rel) {
  const src = path.join(from, rel), st = fs.statSync(src);
  if (skip.has(path.basename(rel)) || skipUnder.some((p) => path.normalize(rel).startsWith(p))) return;
  if (st.isDirectory()) { fs.mkdirSync(path.join(to, rel), { recursive: true }); for (const e of fs.readdirSync(src)) copy(path.join(rel, e)); }
  else fs.copyFileSync(src, path.join(to, rel));
}
fs.mkdirSync(to, { recursive: true });
for (const e of fs.readdirSync(from)) copy(e);

const slug = path.basename(to).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "video";
const pkg = JSON.parse(fs.readFileSync(path.join(to, "package.json"), "utf8"));
pkg.name = slug; pkg.description = title;
// blockrig is linked relative to the folder: keep it pointing at the same library
const lib = path.relative(to, path.resolve(from, "../.."));
pkg.dependencies.blockrig = `file:${lib.split(path.sep).join("/")}`;
fs.writeFileSync(path.join(to, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
const storyMd = path.join(to, "docs/story.md");
fs.writeFileSync(storyMd, fs.readFileSync(storyMd, "utf8").replace(/^title: .*$/m, `title: ${title}`).replace(/^slug: .*$/m, `slug: ${slug}`));
fs.writeFileSync(path.join(to, "docs/feedback.md"), fs.readFileSync(path.join(to, "docs/feedback.md"), "utf8").replace(/## This video[\s\S]*$/, "## This video\n\n- (add items here)\n"));
console.log(`new video in ${to}\n  cd ${dest} && npm install\n  then write docs/story.md (story skill), docs/visuals.md, docs/audio.md, and npm run studio`);
