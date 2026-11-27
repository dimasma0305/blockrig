# Audio

## Voice

The narrator of viral Roblox story shorts: a young, slightly high male voice, expressive, ~160 words a minute
overall with no dead air (reference measured at 161 wpm, 2.7 words/s including pauses).

- engine: chatterbox
- voice: am_adam
- pitch: 1.35
- exaggeration: 0.9
- cfg: 0.35
- tempo: 1.0
- gap: 0.2
- panic: exaggeration 1.4, cfg 0.3, gain 2

Engines (`npm run setup-voice` installs the offline ones):

| Engine | What | Needs |
|---|---|---|
| chatterbox | expressive, emotion control; voice copied from a Kokoro sample; very short lines fall back to Kokoro | NVIDIA GPU, `npm run setup-voice` (~3 GB) |
| kokoro | clean, flat intonation, fast | `npm run setup-voice` (~340 MB) |
| edge | Microsoft neural voices | `pip install edge-tts`; sends the text to Microsoft (ask the user first) |
| sapi | Windows' built-in voice | nothing; robotic placeholder |

Each shot's `emotion:` in story.md picks how the narrator says it (see the voice skill's table); a line ending in "!" without one is `panic`.

## Music

- s01: comedy
- s04: suspense
- s06: happy

Themes are synthesized in code (scripts/music.mjs): mystery, suspense, happy, comedy, sad, action, chill, cyber, triumph. Mixed at 0.2 under the voice. No chart songs; the user adds trending sounds in the app.

## Sound effects (planned)

| Shot | Effect |
|---|---|
| s04 | thunder crack on each lightning strike, rain loop |
| s05–s06 | rain loop, fading out in s06 |
