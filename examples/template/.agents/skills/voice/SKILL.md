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

## Emotion: say each line the way it means

Every narrated shot has `emotion:` in docs/story.md. The narrator must sound like the line: "Rank... last." is
**sad** (it was once marked "!" and came out cheerful: never use "!" to mean "emotional"). Each emotion picks a voice
sample read in that mood (Chatterbox copies its delivery), the exaggeration and pacing, and tempo and volume. **Never
shift pitch or add filters per emotion**: that made sad lines sound like a different person. `npm run check` flags any
clip whose pitch drifts more than 20% from the narrator's median.

| Emotion | Use for | Delivery |
|---|---|---|
| neutral | plain set-up lines | base settings |
| flat | a strange rule or a matter-of-fact line, stated deadpan ("In this town, it rains every time someone lies.") | exaggeration 0.3, cfg 0.55, tempo 1.2 (flat AND fast, as measured), its own plainly read sample |
| happy | good news, warm lines | brighter |
| excited | hype, the hook, wins, lists building up | energetic, a bit faster, louder |
| panic | lies, chaos, "oh no" | most intense, fast, loud |
| shocked | sudden reveals, "Nothing worked!" | intense |
| scared | fear, threats | anxious, a bit fast, softer |
| sad | losses, loneliness, confessions | slow, flat, soft |
| serious | stakes, rules, determination | slower, steady |
| smug | punchlines, twists, "I did it my way" | relaxed, a bit slower |
| angry | arguments | intense, loud |
| whisper | secrets, tension before a reveal | quiet, slow |

Lesson: an early version also pitched sad lines down (184 → 128 Hz) and it sounded like another voice. Tune or add
emotions in `docs/audio.md` (`- emotions: ...` is passed to the script as `emotions`) or in `EMOTIONS`.

## Pace and emotion

- Pace is set by `tempo` (time-stretch, same pitch) and `gap`; `npm run check` reports wpm overall. Aim 150–170.
- Emotion is per line (`emotion:`); a line ending in "!" without one defaults to panic. A line has one mood, so split a shot's narration into two shots when the mood turns mid-line.
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

## Measure, don't guess (scripts/voice/analyze_ref.py)

Compare our lines with the user's reference shorts by numbers: words per minute per sentence, pause between
sentences, median pitch and pitch movement in semitones (docs/references.md has the method and the measured
viral numbers). Viral narrators: fast inside sentences (200-330 wpm), a 0.35-0.65 s beat between them (`gap`),
flat lines 2-3 st, lively lines 5-15 st, excited lines up to +50% pitch. `npm run check` allows high-energy lines
(panic, shocked, excited, angry, happy) 35% above the median; anything else, and anything lower, stays within 20%.

## Punctuation is timing

A comma is a short breath, "..." or a full stop inside a line a beat. Fast and flat takes often run straight
through them, so after choosing a take the voice script makes every comma at least `commaPause` (0.22 s) and every
inner "..."/"."/"!"/"?" at least `stopPause` (0.4 s) of real silence (measured from loudness, not Whisper's word
gaps), cut at the quietest point between the words, and re-times the words for captions. The voice log shows
"+N pause". Write the pause you want into the line: "In this town, it rains..." gets its breath; "In this town it
rains" does not. Tune both in docs/audio.md (`commaPause`, `stopPause`).
