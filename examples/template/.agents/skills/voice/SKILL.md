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

Default (docs/audio.md): `engine: chatterbox-js`, `voice: am_adam`, `pitch: 1.35`, `exaggeration: 0.9`, `cfg: 0.35`,
`tempo: 1.0`, `gap: 0.45`, `commaPause: 0.22`, `stopPause: 0.4`.

| Engine | How | Notes |
|---|---|---|
| **chatterbox-js** (default) | plain Node, no Python, CPU: Chatterbox (MIT, ONNX via onnxruntime-node) with classifier-free guidance, voice copied from a kokoro-js `am_adam` sample pitched ×1.35; every take checked by Whisper (Transformers.js) | same voice as the Python engine; ~10–15 s per take on a laptop CPU; first run downloads ~1.6 GB of models to `~/.cache` (tell the user) |
| chatterbox | the same model in Python on an NVIDIA GPU (`npm run setup-voice`) | faster with a GPU; adds per-word clarity scores |
| kokoro | open model (Apache 2.0), offline, fast | clean but flat; male voices are adult, so pitch up ×1.3–1.4 with formant shift |
| edge | Microsoft neural (edge-tts) | needs the user's OK: the text goes to Microsoft |
| sapi | Windows voice | placeholder only |

chatterbox-js needs only `npm install` (`scripts/voice-js/`). Each line gets up to 8 seeded takes and keeps the first
that Whisper hears word for word *and* whose pitch is within the check's limits of the other lines' median (so
`VOICE_ONLY=s04 npm run voice` re-voices one line to match the rest). CFG matters: without it 1 in 4 takes slurred
or babbled; with it every CTF line passed in 1–3 takes. Per-emotion `cfg` is in `EMOTIONS`.

## Emotion: say each line the way it means

Every narrated shot has `emotion:` in docs/story.md. The narrator must sound like the line: "Rank... last." is
**sad** (it was once marked "!" and came out cheerful: never use "!" to mean "emotional").

**One narrator, always.** Every line clones the same voice sample; an emotion only changes how strongly the line is
performed (exaggeration, cfg), its tempo by at most 5%, and its loudness. Separate voice samples per mood (an excited
reading, a sad reading...) made each line sound like a different speaker and the user could not follow the story;
a fast "deadpan" tempo made the hook hard to catch. **Never shift pitch, add filters, or use a per-mood sample.** `npm run check` flags any
clip whose pitch drifts more than 20% from the narrator's median.

| Emotion | Use for | Delivery |
|---|---|---|
| neutral | plain set-up lines | base settings |
| flat | a strange rule or a matter-of-fact line, stated calmly ("In this town, it rains every time someone lies.") | exaggeration 0.45, cfg 0.5, normal tempo (the 1.2x "viral" tempo was too fast to follow) |
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

Every Chatterbox take is transcribed (Whisper: Transformers.js in chatterbox-js, faster-whisper in Python) and retried until it says the script; the match is saved next
to each clip and `npm run check` flags anything below 85%. Still: tell the user you can't hear, and when they
dislike the voice, make numbered samples of the same line (vary voice, pitch, exaggeration, tempo) and let them
pick. To compare with a reference video, put its script in out/ref (git-ignored) and render it with each option at
the reference's length.

## Music

Synthesized in `scripts/music.mjs` (no downloads, nothing to credit): mystery, suspense, happy, comedy, sad, action,
chill, cyber, triumph (add a mood by adding a line to `THEMES`). Set sections in docs/audio.md (`- s04: suspense`). Mixed at 0.2. Never
chart songs; the user adds trending sounds when posting.

## Measure, don't guess (scripts/voice/analyze_ref.py)

Compare our lines with the user's reference shorts by numbers: words per minute per sentence, pause between
sentences, median pitch and pitch movement in semitones (docs/references.md has the method and the measured
viral numbers). Viral narrators: fast inside sentences (200-330 wpm), a 0.35-0.65 s beat between them (`gap`),
flat lines 2-3 st, lively lines 5-15 st, excited lines up to +50% pitch. Numbers guide, the listener decides: copying
their speed made our hook too fast, so being understood comes first (clarity bar: every word >= 0.6, mean >= 0.85). `npm run check` allows high-energy lines
(panic, shocked, excited, angry, happy) 35% above the median; anything else, and anything lower, stays within 20%.

## Punctuation is timing

A comma is a short breath, "..." or a full stop inside a line a beat. Fast and flat takes often run straight
through them, so after choosing a take the voice script makes every comma at least `commaPause` (0.22 s) and every
inner "..."/"."/"!"/"?" at least `stopPause` (0.4 s) of real silence (measured from loudness, not Whisper's word
gaps), cut at the quietest point between the words, and re-times the words for captions. The voice log shows
"+N pause". Write the pause you want into the line: "In this town, it rains..." gets its breath; "In this town it
rains" does not. Tune both in docs/audio.md (`commaPause`, `stopPause`).

A pause is only ever cut into real silence (quieter than 3% of the line's peak), with 6 ms fades either side; where
the words run together, no pause is added. Cutting at "the quietest point" regardless once split a word in two
("Sawit" after "hills.": Whisper's word edges were a tenth of a second off), an audible glitch the user heard. If a
line needs the beat anyway, re-voice it (another take) rather than forcing a cut.

## Music

Every theme is synthesised in code (scripts/music.mjs), original and free to commit and post. **Default:
`quirky-arp`** (scripts/music-arp.mjs): a bouncy staccato piano + detuned synth arpeggio, 94 bpm, tuned to A=451 Hz,
over Db, Db6/Bbm, Bbm and an augmented A-Db-F twist (the awkward colour the user likes). When the user brings a
transcription of a song they like, use what nobody owns (tempo, tuning, chord progression, instruments, texture)
and write the riff and melody yourself; never play a song's riff or melody note for note. Also: `casio`
(scripts/music-casio.mjs), built to the user's own brief: instrumental lo-fi bedroom pop, cheap 90s Casio toy
keyboard (pulse-wave stabs and rhythm box crushed to 6 bits / 11 kHz), bouncy staccato bass (root-octave-fifth
eighths, chromatic walk-ups), slightly detuned retro lead (+-12 cents), quirky awkward comedy (C E7 F Fm, a
hesitating tune with a chromatic "wah-wah" slide), 120 bpm, 4-bar loop. When the user writes a brief like that,
build to every item and show which line answers which. Also: `bedroom`
(scripts/music-bedroom.mjs): a dreamy two-bar guitar melody looped over Fmaj7 Em7 Dm7 Cmaj7, lo-fi, 88 bpm, the
melody the loudest band. When the user names a song ("use this, it's free"), check its page for a license first:
free to WATCH is not free to USE. A song without an explicit licence (no "no copyright", "free to use", Creative
Commons) is not used, and neither is its melody (a melody is the most protected part); make an original loop in its
vibe instead and say why. Also: `story`
(scripts/music-story.mjs) under the whole video: a singable 8-bar tune that is neither happy nor sad (D Dorian,
curious and thoughtful, ends open so it keeps moving), marimba and piano over a laid-back beat. The user asked for
"more of melody, that isn't happy or sad": a real tune beats a 4-note loop, but keep it singable (steps and small
leaps, one motif developed, the tune the loudest band). For a jokey short: `brainrot`
(scripts/music-brainrot.mjs), an earworm loop. What makes it stick (the user asked for music
"easy to remember, easy to echo", and found a full tune "too complex"):
- a hook of 3-4 notes only, on intervals everyone can already sing (the playground chant sol-mi-la-sol), in a chant
  rhythm ("da-da DUM"), repeated A A A B;
- sung ("la-la" formant voice) and doubled by a bell an octave up, LOUDER than the drums and bass (check the
  250 Hz-1 kHz band is the loudest);
- the most familiar chords (C Am F G), a bouncy bass, four-on-the-floor kick, claps on 2 and 4, hats.
Also: `goofy-piano` / `sneaky-piano` (simple 4-note piano loops), mystery, suspense, happy, comedy, sad, action,
chill, cyber, triumph, `memory` / `memory-faded` (a worn 1930s record; "not good" to the user, only on request).
Never download chart songs or copyrighted albums ("Everywhere at the End of Time" was refused for reuse; Content ID
claims it); the user adds trending sounds in the app. Pick themes per shot in docs/audio.md "Music", then `node scripts/voice.mjs --music-only` rebuilds the music without re-voicing. You cannot hear it: check loudness and
bands (`ffmpeg ... volumedetect` per band) and ask the user to listen.
