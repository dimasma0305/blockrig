# Audio

## Voice

The narrator of viral Roblox story shorts: a young, slightly high male voice. Measured on four viral shorts
(3-6M views; `scripts/voice/analyze_ref.py`, numbers in docs/references.md): 160-210 wpm overall; sentences spoken
fast (200-330 wpm) with a 0.35-0.65 s beat between them; matter-of-fact lines flat (2-3 semitones of pitch movement)
and very fast; hooks and reactions lively (5-15 st), excited lines jumping 30-50% higher. Here: one narrator on every
line (one voice sample), the hook `flat` (calm, normal speed), every word clear first.

- engine: chatterbox-js
- voice: am_adam
- pitch: 1.35
- exaggeration: 0.9
- cfg: 0.35
- tempo: 1.0
- gap: 0.25
- commaPause: 0.22
- stopPause: 0.4
- panic: exaggeration 1.4, cfg 0.3, gain 2

Engines (`npm run setup-voice` installs the offline ones):

| Engine | What | Needs |
|---|---|---|
| chatterbox | expressive, emotion control; voice copied from a Kokoro sample; very short lines fall back to Kokoro | NVIDIA GPU, `npm run setup-voice` (~3 GB) |
| kokoro | clean, flat intonation, fast | `npm run setup-voice` (~340 MB) |
| edge | Microsoft neural voices | `pip install edge-tts`; sends the text to Microsoft (ask the user first) |
| sapi | Windows' built-in voice | nothing; robotic placeholder |

Each shot's `emotion:` in story.md picks how the narrator says it (see the voice skill's table); a line ending in "!" without one is `panic`.

## Voices

The user found one voice for everyone hard to follow (2026-11-28): each dialogue speaker has their own voice sample
(Kokoro voice, pitch); the narrator and "me" (the narrator as a kid) keep the narrator's. Kokoro voices are Apache 2.0.

- mom: af_heart 1.0
- dad: am_michael 0.95
- friend: am_puck 1.3
- system: bf_emma 1.0

## Music

- s01: suspense
- s04: quirky-arp
- s38: story
- s47: suspense
- s52: action
- s54: none
- s59: triumph
- s61: quirky-arp
- s68: none

`none` is silence (room tone): the music stops when Dad walks in with the sandwich (s54) and at the ending (s68).

A bouncy, awkward broken-chord loop at 94 bpm tuned to A = 451 Hz, over Db, Db6/Bbm, Bbm and an augmented A-Db-F
twist (the user's notes on a song they like: its tempo, tuning and chords are free to use, its riff is not, so the
arpeggio order and top line are our own).

Themes are synthesized in code (scripts/music.mjs): mystery, suspense, happy, comedy, sad, action, chill, cyber, triumph, memory, memory-faded (scripts/music-memory.mjs), goofy-piano, sneaky-piano (scripts/music-piano.mjs), brainrot (scripts/music-brainrot.mjs), story (scripts/music-story.mjs), bedroom (scripts/music-bedroom.mjs), casio (scripts/music-casio.mjs), quirky-arp (scripts/music-arp.mjs). Mixed at 0.2 under the voice. No chart songs; the user adds trending sounds in the app.

## Sound effects (planned)

| Shot | Effect |
|---|---|
| s04 | thunder crack on each lightning strike, rain loop |
| s05–s06 | rain loop, fading out in s06 |
