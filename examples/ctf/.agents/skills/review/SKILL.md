---
name: review
description: Check a video before and after rendering - docs and voice checks, stills and contact sheet with the debug overlay, frame sheets from the MP4, measuring a reference video's pace, and logging user feedback. Use before every full render, after every user comment, and when comparing against a reference video.
---

# Review

## Before a full render

1. `npm run check` — docs compile, every take says its line (speech recognition), pace ~150–170 wpm, caption timing, types.
2. `npm run stills` → look at `out/contact-sheet.jpg`. Then `DEBUG=1 npm run stills -- <ids>` for anything doubtful. Check:
   - faces visible and clear of the caption band and app zones;
   - nothing between the camera and the hero; camera not inside a model;
   - every surface textured, every outdoor shot with its weather and time of day;
   - characters on the ground (not floating, not sunk), seated ones on the seat;
   - expressions match the line.
3. Debug compositions when relevant: `--comp Lineup`, `PoseLab`, `MaterialBoard`, `WeatherLab`.

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
