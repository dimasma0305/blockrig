# AGENTS.md: making a viral Roblox-style short

This folder is a complete, self-contained video project: a narrated vertical short (YouTube Shorts / TikTok /
Reels) with **BlockRig** characters (`../..`), a 3D world in **three.js** (React Three Fiber), rendered by
**Remotion**. Start a new video with `npm run new -- ../my-video "Title"`, never by editing the template in place.
This file and `.agents/skills/` are the one copy of the rules: videos in this repo (`../ctf`, `../sawit`, and
new ones) point here from their own short AGENTS.md, so improve them here and every video gets it.

## Where things are

| Path | What | Who edits it |
|---|---|---|
| `docs/` | **Source of truth.** `story.md` (shots), `visuals.md` (look bible), `audio.md` (voice, music), `feedback.md` (what the user asked for), `references.md` | you, first, for any change |
| `src/generated/story.json` | compiled from docs by `npm run docs` | never by hand |
| `src/kit/` | generic building blocks. Shared and tested in BlockRig (`blockrig/video`, re-exported by `src/kit/index.ts`): timeline and captions, posing, camera recipes, lighting, surface softness, Roblox map renderer, collision probe (Rapier), boards, images. Local: captions and soundtrack components, overlays, post effects, light rig, cascaded shadows, weather, textures, structures, fire, 2D layout plan (Turf), ground layers, debug overlay | improve when a fix helps every video; shared parts are fixed in BlockRig (`src/video/`, with a test) |
| `src/cast/` | characters, wardrobe (Shirt/Pants drawn in code), hair and props, pose clips | per video |
| `src/world/` | locations, their props, and how weather and daylight apply | per video |
| `src/direction/` | `performance.ts` (who does what per shot), `camera.ts` (one recipe per shot) | per video |
| `src/debug/` | Lineup, PoseLab, MaterialBoard, WeatherLab, MapLab (Roblox maps), PlanLab (layout from above) compositions | when adding cast, clips, textures, weather, maps, layout |
| `assets/` | Remotion's public folder: `audio/` (generated), `cc0/`, `textures/`, `roblox/` (downloaded, git-ignored), `manifest.json` | via scripts |
| `scripts/` | docs compiler, voice, setup, asset fetchers, stills, render, preview, checks, new-video | |
| `.agents/skills/` | how to do each stage well | read the one for the stage you are in |

## Stages (skills in `.agents/skills/`)

| # | Stage | Skill | Output |
|---|---|---|---|
| 0 | Overview, defaults the user expects | `viral-short` | — |
| 1 | Story and shot list | `story` | `docs/story.md` |
| 2 | Look: cast, places, materials, weather | `look`, `world`, `materials` | `docs/visuals.md`, `src/cast`, `src/world` |
| 3 | Voice and music | `voice` | `docs/audio.md`, `assets/audio/` |
| 4 | Assets (optional) | `assets` | `assets/manifest.json`, downloads |
| 5 | Acting, camera, effects | `camera`, `vfx` | `src/direction`, `src/kit` |
| 6 | Check and render | `review`, `render` | stills, contact sheet, `out/<slug>.mp4` |

```bash
npm install
# the voice is plain Node (chatterbox-js, first run downloads ~1.6 GB of models); npm run setup-voice only for the Python engines
npm run docs             # compile + check docs/ (every other command runs it first)
npm run voice            # narration clips, word timings, music
# compare the narration with reference shorts (tempo, pauses, pitch, expression): docs/references.md, voice skill
~/.venvs/chatterbox/Scripts/python scripts/voice/analyze_ref.py out/ref/*.m4a   # then: ... --ours
npm run check            # voice says the right words, pace, captions, types
npm run collide          # Rapier: cameras in walls, hidden faces, characters in props / floating / sunk / stiff on soft seats (-- --no-roblox for the all-original cut)
npm run studio           # live preview; Debug folder: Sandbox (one character: orbit, try faces, hair, clips, light, effects), Shot, Lineup, PoseLab, MaterialBoard, WeatherLab, MapLab, PlanLab
npm run fast-gpu         # once per Windows laptop with two GPUs: renders on the fast GPU (ask the user first)
npm run stills           # one still per shot -> out/contact-sheet.jpg (DEBUG=1 for the overlay)
npm run render           # out/<slug>.mp4
npm run preview          # small MP4 + GIF for sharing
```

## Rules

1. **Docs first.** Every change starts in `docs/`. Story changes after the voice mean redoing audio, captions and shots, so get the hook and plot approved before voicing.
2. **Read `docs/feedback.md` before changing anything**, and add every new request to it. Fixes must not be undone by a later session.
3. **Voice before animation.** Shot lengths come from the measured narration, never guesses.
4. **Frame-pure.** Everything is a function of the frame: no `Math.random()`, `Date.now()`, `useFrame` deltas or `THREE.Clock`. Use `rng(seed)`, `poseAt`, and time-driven shaders. Remotion renders frames in parallel tabs, so even textures must be seeded.
5. **Characters come from BlockRig** and follow its Roblox-parity rules (`../../AGENTS.md`). If a character needs something BlockRig lacks, add it to the library with tests.
6. **Assets first: don't reinvent.** Before building anything in code (a model, texture, sky, cloud, animal, prop, face, clothing, hair, animation), look for a downloadable asset: the source list in the `assets` skill, listed in `assets/manifest.json`, fetched by `npm run assets` / `npm run roblox`. Code-built kit pieces (`src/kit/structures.ts`, `textures.ts`, procedural hair/clothes) are only a fallback when no asset fits, and the reason goes in `docs/visuals.md`. Every visual item in `docs/visuals.md` names its source.
7. **Nothing plain.** Every character has clothes, hair or headwear and an accent; every location has structure (buildings with roofs, windows, fences, props), every surface a texture, every outdoor shot a weather and time of day.
8. **Check stills before a full render**, with the debug overlay for framing (faces clear of captions and app buttons).
9. **Licences.** Roblox allows Roblox avatars and catalog items in videos, monetized too (Developer Relations, devforum.roblox.com/t/1843674, 2022): use them freely in the shorts. The downloaded FILES stay out of git (assets/roblox, fetched per machine by `npm run roblox`): videos yes, redistributing asset files no. Commit only original or CC0 content otherwise. Posting is the user's job.
10. **You cannot hear audio.** Use `npm run check` (speech recognition of every take), measure pace, and ask the user to listen.
11. **Plan, place, check.** Lay every location out on a 2D plan first (`src/kit/plan.ts`, Turf: zones, lots, a stage for each shot, footprints that may not overlap; `world` skill), put characters on surfaces by how those behave (`restOn`: a bed gives way, a floor does not; `materials` skill), and run `npm run collide` before rendering (cameras in walls, hidden faces, characters in props, floating, sunk or stiff; `review` skill).
12. **The quality bar is the standard for every video.** Match the user's reference shorts (docs/references.md:
    faces, hair and bodies like Xd_yEnAdiGo; light, sky and surfaces like wVjP5B-94MM) and pass the `viral-short`
    skill's quality bar before every full render. When the user points at a new reference, measure or look at it
    (voice: `analyze_ref.py`; look: stills side by side), write what to take into docs/references.md and the skill it
    belongs to, so the next video starts from it.
