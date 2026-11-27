# Feedback log

What the user asked for and what changed, newest first. Read this before changing anything, so a fix is not
undone later. One line per item: date, what they said, what we did, where.

## Carried over from earlier videos (defaults for every new video)

- The narration must not feel rushed: aim for ~160 wpm overall (measured on a reference short), with short gaps. 305 wpm was "too fast". → audio.md pace, `tempo`, `gap`.
- The voice needs intonation, not a flat read; lines with "!" should sound panicked. → Chatterbox engine with `panic` settings.
- The narrator must sound like the meaning of each line ("Rank... last" said happily was wrong). → `emotion:` per shot (sad, excited, shocked, smug...), with mood-specific voice samples.
- Use online assets (models, environment, weather, clouds, sun, birds, roads, lamps, wood, grass, faces, clothes, hair) instead of reinventing them in code. → assets-first rule in AGENTS.md and the skills.
- Use real Roblox items (expressions, clothes, hair) where possible → local Roblox mode: dynamic heads with FaceControls expressions, catalog hair, shirts, pants (`--roblox`; never published).
- Preferred narrator: Kokoro `am_adam`, pitched 1.35, as the voice sample for Chatterbox.
- Characters must not look plain: real clothes, hair, accessories, an accent colour each. → look skill.
- Worlds need weather and structure, not empty boxes: houses with roofs, windows, fences, trees, lamps, power lines; rain/snow/fog/lightning per shot. → world skill, kit/weather.ts, kit/structures.ts.
- Every surface needs a texture (road, sidewalk, bed, lamp, walls...). → materials skill, kit/textures.ts.
- Body parts must not poke through layered clothing. → BlockRig HSR (on by default).
- Use visually attractive, good-quality assets, like popular Roblox story channels (girl and boy with anime faces, real hair, detailed houses and rooms). → local Roblox mode: anime face accessories, free Toolbox maps for the house and the bedroom (`buildRobloxMap`).
- Roads must run along the street, not sideways. → road tiles turned π/2 in World.ts.
- Every word of the narration must be clear (e.g. "in this town"). → voice takes need per-word clarity ≥0.45 and stricter word match.
- Captions or floating tags must not cover faces. → camera skill, debug overlay.

## This video

- (add items here)
