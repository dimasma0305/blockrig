// Compile docs/story.md + docs/audio.md (the source of truth) into src/generated/story.json, which the code
// and the voice script read, and check it. Never edit the generated file; edit the docs and run `npm run docs`.
//   node scripts/docs.mjs          compile + check (exits 1 on errors, prints warnings)
// The parsing and the checks live in BlockRig (blockrig/video compileStory, tested there): captions must cover the
// line, `say:` must keep the word count, silent shots need a `min`, and faces, weather, times, emotions, lighting
// presets and music themes must exist.
import fs from "node:fs";
import path from "node:path";
import { compileStory } from "blockrig/video";
import { THEME_NAMES } from "./music.mjs";

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const { story: compiled, errors, warnings, words } = compileStory(read("docs/story.md"), read("docs/audio.md"), { themes: THEME_NAMES });

const story = { $generated: "from docs/ by scripts/docs.mjs - edit the docs, not this file", ...compiled };
fs.mkdirSync("src/generated", { recursive: true });
fs.writeFileSync("src/generated/story.json", JSON.stringify(story, null, 2) + "\n");
// placeholder timings so a fresh copy renders before any voice exists (npm run voice replaces it)
if (!fs.existsSync("assets/audio/timings.json")) { fs.mkdirSync("assets/audio", { recursive: true }); fs.writeFileSync("assets/audio/timings.json", JSON.stringify({ placeholder: true, clips: {}, music: [], total: 0 })); }

console.log(`docs -> ${path.join("src", "generated", "story.json")}: "${story.title}", ${story.shots.length} shots, ${words} words (~${(words / 2.7).toFixed(1)} s of narration at 2.7 words/s)`);
for (const w of warnings) console.log(`  warning: ${w}`);
for (const e of errors) console.log(`  ERROR: ${e}`);
if (errors.length) process.exit(1);
