---
name: render
description: Check and render the video - stills, a contact sheet, the full MP4, and the README preview. Use before every full render and whenever the user asks for the final video.
---

# Render

1. `npm run stills`: renders one still per shot at 0.5 scale into `out/stills/` and tiles them into `out/contact-sheet.jpg`. **Look at the sheet** before going further. Check for:
   - characters off-frame or clipping through the ground;
   - a camera inside a model;
   - rank tags or captions covering a face;
   - unreadable captions;
   - wrong expressions.
2. `npm run render`: full 1080×1920 at 60 fps into `out/ctf.mp4` (H.264, CRF 18). It takes several minutes, so run it in the background.
3. `npm run preview`: makes `../../docs/ctf-preview.gif` (a short, small looping GIF for the README) and copies the MP4 to `../../docs/ctf.mp4`.
4. Check the MP4 with `ffprobe`:
   - the duration should match the timeline;
   - there should be a video stream and an audio stream;
   - the frame rate should be 60.

   Then pull a contact sheet from the MP4 itself (`ffmpeg -vf select=…,tile=6x3`) and look at it.

You can check the frames but not hear the audio. Say so when you hand the video over.

## Windows notes

- If Remotion's browser fails to start with a misleading `ENOENT`, the project path is too long. Copy `chrome-headless-shell` to a short path and put that path in `.browser-path`.
- Rendering uses ANGLE for WebGL (`remotion.config.ts`), so shadows and post effects come out the same as in Studio.
