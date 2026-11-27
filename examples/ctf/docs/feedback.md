# Feedback log

What the user asked for and what changed, newest first.

- 2026-11-27 — "maximise online assets instead of reinventing (expressions, clothes, hair, models, environment, weather, clouds, sun, birds, road, lamp, wood, grass)" → assets-first rule in AGENTS.md and every skill; street rebuilt from Kenney City Kit Commercial / Roads / Car Kit and Poly Haven textures.
- 2026-11-27 — "spikes in the narrator, sad sounds like another voice" → no pitch shifting per emotion; takes kept within ±18% of the narrator's pitch; check flags drift.
- 2026-11-27 — "why does he say rank last so happily? I want emotion, the correct intonation and expression for each line" → `emotion:` per shot (s04 sad, s05/s06/s09 serious, s08 shocked, s10/s14 smug, wins excited); "!" removed from s04; mood-specific voice samples.
- 2026-11-27 — "lacking the weather, the structure" → rain/storm/lightning per shot (kit weather), dressed towers (ledges, rooftop tanks, AC, antennas, fire escapes, awnings), street furniture, cables, textured wet road and sidewalks.
- 2026-11-27 — "the dramatic one is good, but '!' should sound like panic" → Chatterbox with `panic` settings on "!" lines (Rank... last!, Nothing worked!, The flag was in a comment!, Now I'm rank one!).
- 2026-11-27 — "am_adam is good but the intonation isn't" → Chatterbox (expressive) using an am_adam sample, pitched ×1.35.
- 2026-11-27 — "the speech is too fast" → measured 305 wpm; reference short is 161 wpm overall; now ~160 with `tempo` and `gap`.
- 2026-11-27 — "voice is fast paced in the originals, no long gaps" → clips trimmed to speech, short gaps.
- 2026-11-26 — "make it interesting: animation, motion, environment, shader, VFX; characters not plain" → this example.

## Defaults carried over

See `examples/template/docs/feedback.md`.

## Carried over from earlier videos (defaults for every new video)

- Use visually attractive, good-quality assets, like popular Roblox story channels (girl and boy with anime faces, real hair, detailed houses and rooms). → local Roblox mode: anime face accessories, free Toolbox maps for the house and the bedroom (`buildRobloxMap`).
- Every word of the narration must be clear (e.g. "in this town"). → voice takes need per-word clarity ≥0.45 and stricter word match.
- Town layout must be realistic: objects placed by rules, not overlapping. → 2D plan with Turf (kit/plan.ts): zones, lots, footprints, scatter/along; PlanLab shows it.
- The narrator sounded like different people from line to line, and was hard to follow. → one voice sample for every mood (emotion = performance strength, tempo within 5%); hook calm at normal speed; stricter clarity bar. Never per-mood voice samples.
- Commas must be heard ("In this town, it rains..."): the flat take ran through it. → the voice script enforces real silence at commas (0.22 s) and inner "..."/stops (0.4 s).
- The hook "In this town..." should be flat, like viral narrators. → `flat` emotion (deadpan, fast), measured against 4 viral shorts with analyze_ref.py; 0.45 s gaps between lines. Narrator pitch (ours ~145 Hz vs viral ~200 Hz): comparison sent, user to choose.
- Materials behave physically: a bed is soft, so a seated body sinks in a little; floors do not give. → kit/surfaces.ts (`restOn`, softness table), checked by `npm run collide` ("stiff", "sunk").
- Staging mistakes (camera in a wall, hidden faces, floating or sunk characters) must be caught before rendering. → `npm run collide` (Rapier, kit/collide.ts).
