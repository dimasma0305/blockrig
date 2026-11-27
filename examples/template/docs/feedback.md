# Feedback log

What the user asked for and what changed, newest first. Read this before changing anything, so a fix is not
undone later. One line per item: date, what they said, what we did, where.

## Carried over from earlier videos (defaults for every new video)

- The narration must not feel rushed: aim for ~160 wpm overall (measured on a reference short), with short gaps. 305 wpm was "too fast". → audio.md pace, `tempo`, `gap`.
- The voice needs intonation, not a flat read; lines with "!" should sound panicked. → Chatterbox engine with `panic` settings.
- The narrator must sound like the meaning of each line ("Rank... last" said happily was wrong). → `emotion:` per shot (sad, excited, shocked, smug...), with mood-specific voice samples.
- Use online assets (models, environment, weather, clouds, sun, birds, roads, lamps, wood, grass, faces, clothes, hair) instead of reinventing them in code. → assets-first rule in AGENTS.md and the skills.
- Preferred narrator: Kokoro `am_adam`, pitched 1.35, as the voice sample for Chatterbox.
- Characters must not look plain: real clothes, hair, accessories, an accent colour each. → look skill.
- Worlds need weather and structure, not empty boxes: houses with roofs, windows, fences, trees, lamps, power lines; rain/snow/fog/lightning per shot. → world skill, kit/weather.ts, kit/structures.ts.
- Every surface needs a texture (road, sidewalk, bed, lamp, walls...). → materials skill, kit/textures.ts.
- Body parts must not poke through layered clothing. → BlockRig HSR (on by default).
- Captions or floating tags must not cover faces. → camera skill, debug overlay.

## This video

- (add items here)
