// Start a new video from this template: copies everything except generated and downloaded files. Inside this repo
// the rules and skills are not copied: the new AGENTS.md / CLAUDE.md point to the template's (one copy for every
// video); a folder outside the repo gets its own copies, since it can't reach the template.
//   npm run new -- ../my-video "My Video Title"
// Then: cd ../my-video && npm install && edit docs/story.md (see the story skill).
import fs from "node:fs";
import path from "node:path";

const [dest, title = "Untitled"] = process.argv.slice(2);
if (!dest) { console.error('usage: npm run new -- <folder> "Title"'); process.exit(1); }
const to = path.resolve(dest);
if (fs.existsSync(to) && fs.readdirSync(to).length) { console.error(`${to} is not empty`); process.exit(1); }
const skip = new Set(["node_modules", "out", "generated", ".browser-path"]);
const skipUnder = ["assets/audio", "assets/roblox", "assets/cc0", "assets/textures", "assets/kenney", "assets/github", "assets/hdri", "assets/polypizza", "assets/credits.json"].map((p) => path.normalize(p));
const from = process.cwd(), repo = path.resolve(from, "../.."), inRepo = !path.relative(repo, to).startsWith("..");
if (inRepo) { skip.add(".agents"); skip.add("AGENTS.md"); skip.add("CLAUDE.md"); }
function copy(rel) {
  const src = path.join(from, rel), st = fs.statSync(src);
  if (skip.has(path.basename(rel)) || skipUnder.some((p) => path.normalize(rel).startsWith(p))) return;
  if (st.isDirectory()) { fs.mkdirSync(path.join(to, rel), { recursive: true }); for (const e of fs.readdirSync(src)) copy(path.join(rel, e)); }
  else fs.copyFileSync(src, path.join(to, rel));
}
fs.mkdirSync(to, { recursive: true });
for (const e of fs.readdirSync(from)) copy(e);
if (inRepo) {
  const tpl = path.relative(to, from).split(path.sep).join("/");
  fs.writeFileSync(path.join(to, "AGENTS.md"), `# AGENTS.md: "${title}" (made from examples/template)

**The rules and the skills live in the template, once:** read [\`${tpl}/AGENTS.md\`](${tpl}/AGENTS.md) and
follow it here. Where it says \`.agents/skills/<stage>\`, read [\`${tpl}/.agents/skills/<stage>/SKILL.md\`](${tpl}/.agents/skills/).
Improve the template's rules and skills when you learn something, so every video gets it; write only what is
specific to this video below.

## This video

(the story in one line, its places and anything unusual in its code)

Read \`docs/feedback.md\` first.
`);
  fs.writeFileSync(path.join(to, "CLAUDE.md"), `@${tpl}/AGENTS.md
@AGENTS.md
`);
}

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
console.log(`new video in ${to}\n  cd ${dest} && npm install && npm run assets\n  then write docs/story.md (story skill), docs/visuals.md, docs/audio.md, and npm run studio`);
