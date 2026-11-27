---
name: voice
description: Make the narration (one clip per shot, word timings) and music from docs/audio.md - engines (Chatterbox, Kokoro, Edge, SAPI), pitch, pace, panic lines, checking takes you cannot hear. Use after the story is approved, and whenever the voice, pace, pitch, emotion or music need to change.
---

# Voice and music

`npm run voice` compiles docs, then `scripts/voice.mjs` writes `assets/audio/<shot>.wav`, per-word timings and the
music into `assets/audio/timings.json`. Shot lengths and captions follow it.

## The narrator users want

A young, slightly high male voice with real intonation, ~160 wpm overall (measured on a popular short: 161 wpm,
2.7 words/s including pauses), short gaps. 300 wpm was "too fast"; a flat read was "not good enough"; "!" lines
should sound panicked.

Default (docs/audio.md): `engine: chatterbox`, `voice: am_adam`, `pitch: 1.35`, `exaggeration: 0.9`, `cfg: 0.35`,
`tempo: 1.1`, `gap: 0.2`, `panic: exaggeration 1.4, cfg 0.3, lift 1.05, gain 2.5`.

| Engine | How | Notes |
|---|---|---|
| chatterbox | expressive TTS (MIT) on an NVIDIA GPU, voice copied from a Kokoro sample reading our own text | best intonation; garbles 1–2 word lines (those fall back to Kokoro automatically); adds an inaudible AI watermark |
| kokoro | open model (Apache 2.0), offline, fast | clean but flat; male voices are adult, so pitch up ×1.3–1.4 with formant shift |
| edge | Microsoft neural (edge-tts) | needs the user's OK: the text goes to Microsoft |
| sapi | Windows voice | placeholder only |

`npm run setup-voice` installs Kokoro, faster-whisper and (with a GPU) Chatterbox into `~/.venvs/blockrig-voice`.

## Pace and emotion

- Pace is set by `tempo` (time-stretch, same pitch) and `gap`; `npm run check` reports wpm overall. Aim 150–170.
- Panic/energy: end the line with "!". Put only the panicked sentence in its own shot or line, or the whole line rises.
- Each clip is trimmed to the speech; pauses inside a line ("Rank... last!") stay.

## You cannot hear it

Every Chatterbox take is transcribed (faster-whisper) and retried until it says the script; the match is saved next
to each clip and `npm run check` flags anything below 85%. Still: tell the user you can't hear, and when they
dislike the voice, make numbered samples of the same line (vary voice, pitch, exaggeration, tempo) and let them
pick. To compare with a reference video, put its script in out/ref (local only) and render it with each option at
the reference's length.

## Music

Synthesized in `scripts/music.mjs` (no downloads, nothing to credit): mystery, suspense, happy, comedy, sad, action,
chill, cyber, triumph (add a mood by adding a line to `THEMES`). Set sections in docs/audio.md (`- s04: suspense`). Mixed at 0.2. Never
chart songs; the user adds trending sounds when posting.
