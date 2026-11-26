# AGENTS.md: making a video with BlockRig

This folder is a complete video project: a narrated vertical short rendered with **Remotion**, a 3D scene in **React Three Fiber** (three.js), and characters from **BlockRig** (`../..`). Follow the stages in order. Each one has a skill in `.agents/skills/` that holds the details.

| Stage | Skill | Produces |
|---|---|---|
| 1. Story | `.agents/skills/story` | `story.json`: narration sentences, captions, shot list |
| 2. Audio | `.agents/skills/voice` | `public/audio/`: one narration clip per sentence with word timings, music |
| 3. Assets | `.agents/skills/assets` | `public/cc0/`: environment models, HDRI, textures (downloaded, not committed) |
| 4. Scene | `.agents/skills/scene` | `src/`: characters, world, camera, captions, effects |
| 5. Render | `.agents/skills/render` | stills, contact sheet, `out/story.mp4` |

```bash
npm install
npm run assets     # CC0 environment packs (and, optionally, Roblox items: see the assets skill)
npm run voice      # narration clips, word timings and music from story.json
npm run studio     # live preview
npm run stills     # check frames before a full render
npm run render     # out/story.mp4
```

## Rules

1. **Story first, and get it approved.** Every later stage is timed to the narration. Changing the story after the voice means redoing audio, captions and shots.
2. **Voice before animation.** Shot lengths come from the narration clips' measured durations and word timings (`public/audio/timings.json`), never from guesses.
3. **Everything animates from `useCurrentFrame()`.** No `requestAnimationFrame`, `Date.now()`, `THREE.Clock`, `Math.random()` or `useFrame` deltas. Use the seeded `rng()` in `src/lib/rng.ts`. Remotion renders frames out of order and in parallel, so anything time-based has to be a pure function of the frame. The BlockRig `Animator` is driven by seeking: `sampleAt(animator, clips, seconds)` replays from the shot start.
4. **Characters come from BlockRig**, following its Roblox-parity rules (`../../AGENTS.md`). Use its rigs, body shapes, heads, accessories, faces and Animator. Don't hand-roll joints or face drawing in this project. If BlockRig is missing something a character needs, add it to the library (with tests) rather than working around it here.
5. **The world is built here**, not in BlockRig, which is a character library. It's built from CC0 models (Kenney, Quaternius), a Poly Haven HDRI and code: instancing, particles, shaders.
6. **Load assets before the first frame.** Wrap every async load in `delayRender` / `continueRender` (see `src/lib/assets.ts`). A model that appears late shows up in some frames and not others.
7. **Check stills before a full render.** Render five or six stills at 0.5 scale, tile them into a contact sheet and look at it. A full render takes many minutes; a still takes seconds.
8. **Licences.** Commit only original or CC0 content. Downloaded files live in `public/cc0/` and `public/roblox/` and are git-ignored. Each CC0 pack's licence file is kept next to it. Roblox catalog items (hair, faces, heads, animations) are optional, fetched with the user's own account for personal use, and never committed or used in the README video.

## Look and feel defaults

- **Format:** 1080×1920, 60 fps, H.264 at CRF 18.
- **Captions:** Montserrat ExtraBold, two to four words, upper case, white with a thick black outline, one highlighted word in yellow. Placed about 64% down the frame, and popping in on the first word's frame.
- **Shots:** cut every one to three seconds and vary the angle (front, low, aerial, close-up). After a surprise, hold half a second on a face.
- **Motion:** eased camera moves (`spring`, `interpolate` with easing), camera motion blur on fast moves, and secondary motion (scarf, hair sway).
- **Lighting:** an HDRI for ambient light, one key light with soft shadows, fog for depth, renderer AgX tone mapping and a CSS vignette (no EffectComposer: it blanks Remotion's frames).
