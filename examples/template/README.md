# Template: viral Roblox-style story shorts

A self-contained project for narrated vertical shorts made with **BlockRig** characters, a **three.js** world and
**Remotion**. Copy it for each new video:

```sh
cd examples/template
npm run new -- ../my-video "My Video"
cd ../my-video && npm install
npm run assets        # download the models, skies and textures in assets/manifest.json (Kenney, Poly Haven, ambientCG, poly.pizza)
# voice: plain Node, no Python (chatterbox-js; first run downloads ~1.6 GB of models)
```

Then write `docs/story.md`, `docs/visuals.md` and `docs/audio.md`, and:

```sh
npm run voice     # narration + timings + music
npm run check     # the voice says the right words, pace, captions
npm run collide   # Rapier staging check: cameras in walls, hidden faces, characters in props or floating
npm run studio    # preview; Debug folder: Sandbox (one character, orbit with the mouse), Shot, Lineup, PoseLab, MaterialBoard, WeatherLab, MapLab, PlanLab
npm run fast-gpu  # once per Windows laptop with two GPUs: render on the fast one (about 4x faster)
npm run stills    # out/contact-sheet.jpg
npm run render    # out/<slug>.mp4
```

With real Roblox items (dynamic heads with expressions, anime face accessories, hair, shirts, pants, and free
Toolbox maps for the house and bedroom), signed in to Roblox in the browser pane: `npm run roblox` (see the assets
skill). Renders then use them by default (`--no-roblox` for an all-original/CC0 cut). Roblox allows its avatars and
catalog items in videos, monetized too; the downloaded files stay git-ignored.

The sample story, "The Rain Knows" (*In this town, it rains every time someone lies*), shows every system: a suburban
street and bedroom built from downloaded CC0 assets (Kenney houses, roads, cars, furniture; Poly Haven HDRI skies and
textures; clouds, birds and an animated dog), drawn clothes and hair, faces, a storm with lightning, wet ground,
golden hour, a lone rain cloud, and an expressive narrator with an emotion per line.

| Folder | What |
|---|---|
| `docs/` | source of truth: story, visuals (look bible, materials, weather), audio, feedback log, references |
| `src/kit/` | reusable: timeline, captions, soundtrack, posing, camera recipes, weather, lighting, textures, structures, overlays, debug overlay |
| `src/cast`, `src/world`, `src/direction` | this video's characters, places, acting and camera |
| `src/debug/` | debug compositions |
| `assets/` | Remotion public folder: generated audio, downloads (git-ignored), `manifest.json` |
| `scripts/` | docs compiler, voice engines and setup, asset and Roblox fetchers, stills, render, preview, checks, new-video |
| `.agents/skills/` | one skill per stage, for coding agents ([`AGENTS.md`](AGENTS.md) is the entry point) |

Everything committed is original (MIT). Downloads are never committed; `assets/credits.json` lists each one's source
and licence, and `npm run assets` prints the credits a video description needs (the sample's bird is CC-BY 3.0,
"Bird" by Poly by Google via poly.pizza). Roblox items appear in the videos (Roblox allows it) but their files are never committed.
