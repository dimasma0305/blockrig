---
name: voice
description: Make the narration (one clip per story sentence, with word timings) and the background music for this project, from story.json. Use after the story is approved, whenever the voice, pace, pitch, timings or music need to change.
---

# Voice and music

`npm run voice` runs `scripts/make-audio.mjs`. It reads `story.json` and writes:

- **Narration:** `public/audio/s01.wav` …, one clip per shot that has narration. Each clip is trimmed to the speech (ffmpeg `silencedetect` at −40 dB, keeping 0.03 s before and 0.06 s after) and its word times are shifted to match.
- **Music:** `public/audio/music-<n>.wav`, one track per `music` entry, each long enough for its section.
- **Timings:** `public/audio/timings.json`, holding each clip's duration and its words' start and end times.

The scene reads `timings.json`, so shot lengths and caption timing always match the audio.

## Narrator

The style of these shorts is a fast, high-pitched young narrator.

| Engine | When | Notes |
|---|---|---|
| `edge` (default when allowed) | Natural Microsoft neural voice through the `edge-tts` Python package; returns exact word times | **Ask the user first**: it needs `pip install edge-tts` and sends the narration text to Microsoft's online service. Style `boy` = Brian, +70% rate, pitched up 1.6×. |
| `sapi` (fallback) | Windows' built-in offline speech, sped up and pitched with ffmpeg | No network or install, but plainly robotic. Word times are estimated from syllables, so treat it as a placeholder. |

**Pace:** these shorts never leave dead air. `story.json` sets `voice.gapSeconds` (0.04 here) between clips, and only silent reaction shots hold longer, through `minSeconds`. If the voice feels slow, raise the rate before adding gaps.

Choose with `VOICE_ENGINE=edge` or `VOICE_ENGINE=sapi` (default `sapi` until the user agrees to edge).

You can't hear the result. Check durations and timings, then tell the user to listen. If they say it sounds off, render a few numbered samples that vary rate and pitch, and let them pick.

## Music

The music is composed in code: simple synthesized tracks for a mood, with nothing to download and nothing to credit. Themes: `mystery`, `sneaky`, `suspense`, `happy`, `chill`, `comedy`, `sad`, `action`, `epic`, `cyber`, `triumph`. Switch theme at the twist if the mood turns. Mix the music at about 0.25 volume under the voice.

Never use chart songs or trending sounds; the user adds those in the posting app if they want.
