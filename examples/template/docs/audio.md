# Audio

## Voice

The narrator of viral Roblox story shorts: a young, slightly high male voice. Measured on four viral shorts
(3-6M views; `scripts/voice/analyze_ref.py`, numbers in docs/references.md): 160-210 wpm overall; sentences spoken
fast (200-330 wpm) with a 0.35-0.65 s beat between them; matter-of-fact lines flat (2-3 semitones of pitch movement)
and very fast; hooks and reactions lively (5-15 st), excited lines jumping 30-50% higher. Here: one narrator on every
line (one voice sample), the hook `flat` (calm, normal speed), every word clear first.

- engine: chatterbox
- voice: am_adam
- pitch: 1.35
- exaggeration: 0.9
- cfg: 0.35
- tempo: 1.0
- gap: 0.45
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

## Music

- s01: memory
- s04: memory-faded
- s06: memory

A fading-memory arc: an original worn 1930s ballroom record far away (in the feel of "Everywhere at the End of
Time", which is copyrighted, so nothing of it is used), further gone when the storm hits, back when he tells the truth.

Themes are synthesized in code (scripts/music.mjs): mystery, suspense, happy, comedy, sad, action, chill, cyber, triumph, memory, memory-faded (scripts/music-memory.mjs). Mixed at 0.2 under the voice. No chart songs; the user adds trending sounds in the app.

## Sound effects (planned)

| Shot | Effect |
|---|---|
| s04 | thunder crack on each lightning strike, rain loop |
| s05–s06 | rain loop, fading out in s06 |
