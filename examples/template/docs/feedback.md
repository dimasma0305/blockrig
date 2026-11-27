# Feedback log

What the user asked for and what changed, newest first. Read this before changing anything, so a fix is not
undone later. One line per item: date, what they said, what we did, where.

## Carried over from earlier videos (defaults for every new video)

- The narration must not feel rushed: aim for ~160 wpm overall (measured on a reference short), with short gaps. 305 wpm was "too fast". → audio.md pace, `tempo`, `gap`.
- The voice needs intonation, not a flat read; lines with "!" should sound panicked. → Chatterbox engine with `panic` settings.
- The narrator must sound like the meaning of each line ("Rank... last" said happily was wrong). → `emotion:` per shot (sad, excited, shocked, smug...), with mood-specific voice samples.
- Use online assets (models, environment, weather, clouds, sun, birds, roads, lamps, wood, grass, faces, clothes, hair) instead of reinventing them in code. → assets-first rule in AGENTS.md and the skills.
- Use real Roblox items (expressions, clothes, hair) where possible → Roblox mode (the default render): dynamic heads with FaceControls expressions, catalog hair, shirts, pants (`--roblox`; never published).
- Preferred narrator: Kokoro `am_adam`, pitched 1.35, as the voice sample for Chatterbox.
- Characters must not look plain: real clothes, hair, accessories, an accent colour each. → look skill.
- Worlds need weather and structure, not empty boxes: houses with roofs, windows, fences, trees, lamps, power lines; rain/snow/fog/lightning per shot. → world skill, kit/weather.ts, kit/structures.ts.
- Every surface needs a texture (road, sidewalk, bed, lamp, walls...). → materials skill, kit/textures.ts.
- Body parts must not poke through layered clothing. → BlockRig HSR (on by default).
- Use visually attractive, good-quality assets, like popular Roblox story channels (girl and boy with anime faces, real hair, detailed houses and rooms). → Roblox items (default): anime face accessories, free Toolbox maps for the house and the bedroom (`buildRobloxMap`).
- Roads must run along the street, not sideways. → road tiles turned π/2 in World.ts.
- Every word of the narration must be clear (e.g. "in this town"). → voice takes need per-word clarity ≥0.45 and stricter word match.
- Pasted a transcription of "Numbers" (94 bpm, Db / Bbm / A-aug arpeggios, ~451 Hz tuning) → `quirky-arp`: same tempo, tuning, chords and texture, our own arpeggio order and top line (default).
- Music brief: "instrumental only, lo-fi bedroom pop, cheap 90s Casio toy keyboard preset, bouncy staccato bassline, slightly detuned retro synth lead, quirky awkward comedy background loop, 120 bpm, no vocals" → `casio` theme.
- Asked for "Numbers" by TEMPOREX (thought free; it is a registered release, lyrics only, no licence) "only the melody in loop" → original `bedroom` guitar melody loop in that vibe.
- Wanted more melody, neither happy nor sad → `story` theme (D Dorian, singable 8-bar tune).
- Music must be easy to remember and to echo, brainrot; a full piano tune was "too complex" → `brainrot` earworm: 4-note chant hook, sung, repeated, loudest in the mix.
- "Memory" record music was "not good"; wanted piano, brainrot music → original `goofy-piano` / `sneaky-piano` themes (default from now on).
- Background music like "Everywhere at the End of Time" (copyrighted, so not used) → original `memory` / `memory-faded` themes: a worn 1930s ballroom record far away.
- Premium, good Roblox assets: most-favourited hair and outfits (premium UGC included), not plain free basics → new cast items; faces Roblox-accurate: textures untouched, skin set to the face plate colour (as players do).
- Use Roblox assets freely: Roblox allows avatars and catalog items in (monetized) videos → the Roblox version is the default render; files stay git-ignored (`npm run roblox`).
- Faces, hair and bodies like https://www.youtube.com/shorts/Xd_yEnAdiGo; shade, texture, lighting and sky like https://www.youtube.com/shorts/wVjP5B-94MM. → kit look: ACES Filmic, strong warm low sun, little fill, crisp clear-day fog, grain on map surfaces, pale skin, `avatarAmbient` on characters; low cameras show the sky (look, world, camera skills).
- Town layout must be realistic: objects placed by rules, not overlapping. → 2D plan with Turf (kit/plan.ts): zones, lots, footprints, scatter/along; PlanLab shows it.
- The narrator sounded like different people from line to line, and was hard to follow. → one voice sample for every mood (emotion = performance strength, tempo within 5%); hook calm at normal speed; stricter clarity bar. Never per-mood voice samples.
- Commas must be heard ("In this town, it rains..."): the flat take ran through it. → the voice script enforces real silence at commas (0.22 s) and inner "..."/stops (0.4 s).
- The hook "In this town..." should be flat, like viral narrators. → `flat` emotion (deadpan, fast), measured against 4 viral shorts with analyze_ref.py; 0.45 s gaps between lines. Narrator pitch (ours ~145 Hz vs viral ~200 Hz): comparison sent, user to choose.
- Materials behave physically: a bed is soft, so a seated body sinks in a little; floors do not give. → kit/surfaces.ts (`restOn`, softness table), checked by `npm run collide` ("stiff", "sunk").
- Staging mistakes (camera in a wall, hidden faces, floating or sunk characters) must be caught before rendering. → `npm run collide` (Rapier, kit/collide.ts).
- Captions or floating tags must not cover faces. → camera skill, debug overlay.

## This video

- (add items here)
