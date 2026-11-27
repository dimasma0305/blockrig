# Template: viral Roblox-style story shorts

A self-contained project for narrated vertical shorts made with **BlockRig** characters, a **three.js** world and
**Remotion**. Copy it for each new video:

```sh
cd examples/template
npm run new -- ../my-video "My Video"
cd ../my-video && npm install
npm run setup-voice   # once per machine: offline voices (Kokoro; Chatterbox with an NVIDIA GPU)
```

Then write `docs/story.md`, `docs/visuals.md` and `docs/audio.md`, and:

```sh
npm run voice     # narration + timings + music
npm run check     # the voice says the right words, pace, captions
npm run studio    # preview; Debug folder: Shot, Lineup, PoseLab, MaterialBoard, WeatherLab
npm run stills    # out/contact-sheet.jpg
npm run render    # out/<slug>.mp4
```

The sample story, "The Rain Knows" (*In this town, it rains every time someone lies*), shows every system: a textured
suburban street and bedroom built in code, drawn clothes and hair, faces, sitting, pointing, a storm with lightning,
wet ground, golden hour, a lone rain cloud, an expressive voice with panicked "!" lines.

| Folder | What |
|---|---|
| `docs/` | source of truth: story, visuals (look bible, materials, weather), audio, feedback log, references |
| `src/kit/` | reusable: timeline, captions, soundtrack, posing, camera recipes, weather, lighting, textures, structures, overlays, debug overlay |
| `src/cast`, `src/world`, `src/direction` | this video's characters, places, acting and camera |
| `src/debug/` | debug compositions |
| `assets/` | Remotion public folder: generated audio, downloads (git-ignored), `manifest.json` |
| `scripts/` | docs compiler, voice engines and setup, asset and Roblox fetchers, stills, render, preview, checks, new-video |
| `.agents/skills/` | one skill per stage, for coding agents ([`AGENTS.md`](AGENTS.md) is the entry point) |

Everything committed is original (MIT). Downloaded CC0 assets keep their licences next to them; Roblox catalog items
are for local use only and never committed or published.
