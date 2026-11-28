---
name: render
description: Render the final video and its share copies - npm run render (out/<slug>.mp4), the debug render, preview MP4/GIF, verifying the file, Windows browser issues. Use when the user asks for the final video or a preview, after the review skill's checks pass.
---

# Render

1. Run the review skill's checks first, including `npm run collide` (a full render takes minutes; a still takes seconds).
2. `npm run render` → `out/<slug>.mp4` (1080×1920, 60 fps, H.264 CRF 18). Run it in the background. It prints an ffprobe summary (a missing audio stream means no voice yet) and where the time went.
   Renders are cached, so re-render freely:
   - **The bundle** is built once and reused by stills, collide and render until the code changes (`scripts/bundle.mjs`; assets are linked, so new audio or textures don't need a new bundle).
   - **Every shot** is its own video segment in `out/.cache/shots`. Its key is the code (not the story data), the story's shared settings, the shot's own story entry and voice clip, its length in frames, the visible assets and the settings. A shot's frames depend only on the shot, not on where it sits: re-voicing or rewriting one line re-renders that shot only, even though every later shot moves. So animation must use the shot's clock (`shotClock(shot, local)`, or `local`), never the video frame or absolute time. Anything `Video.tsx` reads across shots goes in `shared` in `scripts/render.mjs`.
   - **The soundtrack** is mixed by ffmpeg (no browser) once per voice or music change.
   - **The MP4** is the segments joined without re-encoding.

   Changed code, but it only affects some shots? `npm run render -- --only s03,s05` re-renders those and reuses every other shot's latest segment. `--fresh` ignores the cache.
   Measured on the template (980 frames, RTX 4060): first render 72–157 s (the frame rate varies between runs), no change 3 s, one shot re-rendered 43 s, one line re-voiced 51 s (before: 168 s every time).
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

## Preview before rendering

The user can watch it live before any render: Remotion Studio (`npm run studio`, or preview_start with a
.claude/launch.json entry `npm --prefix <video> run studio -- --port 3123 --no-open`), composition Story with the
`roblox` prop on (this video's Root sets it by default). Offer it whenever the user wants to check changes.

## Speed

`node scripts/bench.mjs [from] [count]` renders the same frames under several settings (`VARIANTS=base,nopost,c6,c12,q80`) and prints frames per second after the tabs start. On the template the same settings ranged 6.4–10.1 frames/s between runs, so repeat a variant before trusting a difference. Tab startup is 15–24 s per run: one long run beats many short ones, which is why the render groups neighbouring shots and shares one browser.


Measured on the nasa video (8 tabs, RTX 4060): a 2:32 video at 60 fps took 11 min 18 s (~13.5 frames/s, about 45 s
of it bundling and browser start). Lights switched per location plus soft-shadow samples 16 → 10 saved 11% on the
same 600 room frames (85 s → 76 s). The frame rate is the big lever: 30 fps halves the frames (the user chose it
there; ask first, it is a quality call). Post effects off (`{ post: false }`) only for drafts. Time an A/B on the same
frames (`npx remotion render Story out/bench.mp4 --frames=a-b --props=out/props.json`) before claiming a speed-up.
