# AGENTS.md: "Everybody Plays CTF" (made from examples/template)

This folder is a complete, self-contained video project: a narrated vertical short (YouTube Shorts / TikTok /
Reels) with **BlockRig** characters (`../..`), a 3D world in **three.js** (React Three Fiber), rendered by
**Remotion**. Start a new video with `npm run new -- ../my-video "Title"`, never by editing the template in place.

## Where things are

| Path | What | Who edits it |
|---|---|---|
| `docs/` | **Source of truth.** `story.md` (shots), `visuals.md` (look bible), `audio.md` (voice, music), `feedback.md` (what the user asked for), `references.md` | you, first, for any change |
| `src/generated/story.json` | compiled from docs by `npm run docs` | never by hand |
| `src/kit/` | generic building blocks: timeline, captions, soundtrack, posing, camera recipes, weather, lighting, textures, structures, overlays, debug overlay | improve when a fix helps every video |
| `src/cast/` | characters, wardrobe (Shirt/Pants drawn in code), hair and props, pose clips | per video |
| `src/world/` | locations, their props, and how weather and daylight apply | per video |
| `src/direction/` | `performance.ts` (who does what per shot), `camera.ts` (one recipe per shot) | per video |
| `src/debug/` | Lineup, PoseLab, MaterialBoard, WeatherLab compositions | when adding cast, clips, textures, weather |
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
npm run setup-voice      # once per machine: offline voices (Kokoro, Chatterbox on an NVIDIA GPU)
npm run docs             # compile + check docs/ (every other command runs it first)
npm run voice            # narration clips, word timings, music
npm run check            # voice says the right words, pace, captions, types
npm run studio           # live preview; Debug folder: Shot, Lineup, PoseLab, MaterialBoard, WeatherLab
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
6. **Nothing plain.** Every character has clothes, hair or headwear and an accent; every location has structure (buildings with roofs, windows, fences, props), every surface a texture, every outdoor shot a weather and time of day.
7. **Check stills before a full render**, with the debug overlay for framing (faces clear of captions and app buttons).
8. **Licences.** Commit only original or CC0 content. Roblox catalog items are for local use only (`assets/roblox/`, git-ignored) and never appear in a published or committed video. Posting is the user's job.
9. **You cannot hear audio.** Use `npm run check` (speech recognition of every take), measure pace, and ask the user to listen.

## This video

"In this world, everybody plays CTF": the last-ranked player beats the World Final by viewing the page source.
Neon city at night with rain and a lightning storm; a Vault plaza with a hex force-field dome (`src/world/vfx.ts`:
tower windows, dome, holograms, glyph rain, beams, particle bursts). Places are in `src/world/layout.ts` (street on
Z, the plaza far away at x = 400). Characters carry floating rank tags welded above their heads, so close-ups aim
below the head (camera skill). The hero types on the terminal by IK (s10). Read `docs/feedback.md` first.
