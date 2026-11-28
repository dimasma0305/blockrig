---
name: render
description: Render the final video and its share copies - npm run render (out/<slug>.mp4), the debug render, preview MP4/GIF, verifying the file, Windows browser issues. Use when the user asks for the final video or a preview, after the review skill's checks pass.
---

# Render

1. Run the review skill's checks first, including `npm run collide` (a full render takes minutes; a still takes seconds).
2. `npm run render` → `out/<slug>.mp4` (1080×1920, 60 fps, H.264 CRF 18). Run it in the background. It prints an ffprobe summary; a missing audio stream means no voice yet.
3. `node scripts/render.mjs --debug` → `out/<slug>-debug.mp4` with the overlay burned in, for reviewing framing with the user (never for posting).
4. `npm run preview -- --to <dir> [--start s --len s]` → a 720p MP4 and a short GIF (GitHub shows GIFs inline, not MP4s from a repo).
5. Pull a frame sheet from the MP4 and look at it (review skill), and scan it for black frames:
   `ffmpeg -i out/<slug>.mp4 -vf "fps=2,scale=64:-1,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=out/yavg.txt" -f null -`
   then list times with YAVG under ~15 that are not night shots. Then send the MP4 to the user.

## Notes

- **Speed.** Renders run 8 frames at a time (`remotion.config.ts`; measured on a 24-core laptop with an RTX 4060:
  2 tabs 108 s, 8 tabs 27 s, 12 tabs 30 s per 180 frames) through ANGLE on the GPU. On a Windows laptop with two
  GPUs, headless Chrome starts on the slow integrated one: run `npm run fast-gpu` once per machine (sets "High
  performance" for the render browser, current user only; ask the user first, it is a system setting).
  `LOGS=1 npm run stills -- s01` prints the GPU each tab uses ("GPU ANGLE (NVIDIA ...").
- The post effects (src/kit/post.ts: ambient occlusion, bloom, SMAA, ACES) cost about half again (27 s -> 40 s
  per 180 frames) and are on by default; `{ "post": false }` in out/props.json renders without them for a quick draft.
- Windows: if the browser fails with a misleading `ENOENT`, the path is too long: copy `chrome-headless-shell` to a short path and put that path in `.browser-path`.
- `THREE.Clock deprecated` warnings from three r184 are harmless.
- You can check frames but not hear audio: say so when handing over. Posting is the user's job.
