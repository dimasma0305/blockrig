---
name: render
description: Render the final video and its share copies - npm run render (out/<slug>.mp4), the debug render, preview MP4/GIF, verifying the file, Windows browser issues. Use when the user asks for the final video or a preview, after the review skill's checks pass.
---

# Render

1. Run the review skill's checks first (a full render takes minutes; a still takes seconds).
2. `npm run render` → `out/<slug>.mp4` (1080×1920, 60 fps, H.264 CRF 18). Run it in the background. It prints an ffprobe summary; a missing audio stream means no voice yet.
3. `node scripts/render.mjs --debug` → `out/<slug>-debug.mp4` with the overlay burned in, for reviewing framing with the user (never for posting).
4. `npm run preview -- --to <dir> [--start s --len s]` → a 720p MP4 and a short GIF (GitHub shows GIFs inline, not MP4s from a repo).
5. Pull a frame sheet from the MP4 and look at it (review skill), then send the MP4 to the user.

## Notes

- Concurrency is 2 tabs (`remotion.config.ts`); WebGL runs through ANGLE so shadows match Studio.
- Windows: if the browser fails with a misleading `ENOENT`, the path is too long: copy `chrome-headless-shell` to a short path and put that path in `.browser-path`.
- `THREE.Clock deprecated` warnings from three r184 are harmless.
- You can check frames but not hear audio: say so when handing over. Posting is the user's job.
