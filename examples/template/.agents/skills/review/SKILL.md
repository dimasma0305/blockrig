---
name: review
description: Check a video before and after rendering - docs and voice checks, stills and contact sheet with the debug overlay, frame sheets from the MP4, measuring a reference video's pace, and logging user feedback. Use before every full render, after every user comment, and when comparing against a reference video.
---

# Review

## Try it on one character first: the Sandbox

`npm run studio` → Debug → **Sandbox**: one character on a small lit stage with the full look (sky, soft shadows,
post effects). Drag to orbit, scroll to zoom; edit its props (`who`, `clip` or "all", `face` or "cycle", `hair` or "cycle", `light` (a preset, or "hdri" for the sky), `soft`, `time`,
`post`, `ao`, `bloom`). Rendered (`npm run stills -- --comp Sandbox 0 150 300`, or `PROPS='{"post":false}'` for a
comparison), the camera turns around the character. Check faces, hair, clothes, clips and the light there before a
shot or a full render.

## Before a full render

1. `npm run check` — docs compile, every take says its line (speech recognition), pace ~150–170 wpm, caption timing, types.
2. `npm run stills` → look at `out/contact-sheet.jpg`. Then `DEBUG=1 npm run stills -- <ids>` for anything doubtful. Check:
   - faces visible and clear of the caption band and app zones;
   - nothing between the camera and the hero; camera not inside a model;
   - every surface textured, every outdoor shot with its weather and time of day;
   - characters on the ground (not floating, not sunk), seated ones on the seat;
   - expressions match the line;
   - held torches, flags and swords upright (equipTool + toolHold, look skill); mouths whole (no head showing through);
   - no flickering ground: the build fails on overlapping ground layers (world skill), but also watch a few frames
     of wide shots across ground seams.
3. `npm run collide` (with the Roblox items by default; `-- --no-roblox` for the all-original cut): Rapier checks every 6th frame of the real render
   (src/kit/collide.ts) and prints each problem with its shot and frames:
   - camera inside a wall or prop (blank or wall-back frames);
   - a character's face hidden from the camera by something solid;
   - a character inside a wall, prop or furniture; feet (or seated hips) floating above or sunk deeper than the
     surface's softness (kit/surfaces.ts), or "stiff": resting exactly on top of something soft like a bed;
   - two characters inside each other.
   Fix the staging (World.ts spots, performance.ts, camera.ts) and run it again until it says "nothing found".
   Things that move (clouds, birds, the dog, weather) carry `userData.noCollide`; a Roblox map collides with
   one solid box per part, like in Roblox.
4. Debug compositions when relevant: `--comp Lineup`, `PoseLab`, `MaterialBoard`, `WeatherLab`, `MapLab` (several frames: `--comp MapLab 480 510 540 570`), and `PlanLab 0 1` for the layout.

## After rendering

`ffprobe` (duration, 60 fps, audio stream), then a frame sheet from the MP4 itself:
`ffmpeg -i out/<slug>.mp4 -vf "fps=1,scale=240:-1,tile=10x3" -frames:v 1 out/mp4-sheet.jpg`, and look at it.

## Feedback loop

Every user comment goes into `docs/feedback.md` (what they said → what changed → where) before you change code. When
they say "too fast", "plain", "not good enough", measure first (wpm, stills), change one thing, show them.

## Measuring a reference video

Open it in the browser pane with captions on and record each caption change with `video.currentTime` (play muted,
poll the caption DOM every 80 ms, in chunks under 45 s per script call). Count words over the spoken span → wpm.
Write the link and numbers in `docs/references.md`. Keep its text and audio local (out/ref, git-ignored); copy pace
and format, never content.
