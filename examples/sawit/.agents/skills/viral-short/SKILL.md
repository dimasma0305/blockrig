---
name: viral-short
description: Overview of making a viral Roblox-style story short with this template - the format, the stage order, and the defaults users have asked for again and again. Read first, before any other skill, whenever the user wants a new video or a better one.
---

# Viral Roblox-style story short

## The format

A narrated mini-story, 15–60 s, vertical, first person, over Roblox-style scenes: an ordinary place (street,
bedroom, school, shop) with one strange rule ("In this town, …"). The narrator barely pauses, the picture changes
every 1–3 s, and 2–4 words of caption are always on screen. One twist at the end that reframes the hook.

## Order (each stage has a skill)

1. **story** → `docs/story.md`. Show the user the hook and one-line plot before anything else.
2. **look / world / materials** → `docs/visuals.md`, then `src/cast`, `src/world`. Lay each location out on the 2D
   plan first (`world` skill: zones, a stage per shot, footprints). Check `Lineup`, `PlanLab`, `MaterialBoard`, `WeatherLab`.
3. **voice** → `docs/audio.md`, `npm run voice`, `npm run check`.
4. **camera / vfx** → `src/direction`, effects. Stills after every change, then `npm run collide` until it finds nothing.
5. **review / render** → the quality bar below, contact sheet, full render, frame sheet from the MP4, report.

For a first version, shrink everything (5–7 shots, ~15 s) rather than skip a stage. The user's reaction to a real
video is worth more than questions up front.

## The standard (what users asked for again and again; keep it unless told otherwise)

Reference shorts in docs/references.md: https://www.youtube.com/shorts/Xd_yEnAdiGo (faces, hair, bodies),
https://www.youtube.com/shorts/wVjP5B-94MM (shade, texture, light, sky). Open them and compare stills side by side.

- **Assets first, don't reinvent:** models, textures, skies, clouds, animals, props, faces, clothes, hair and
  animations come from downloadable assets (`assets` skill, `assets/manifest.json`; Roblox catalog items and Toolbox maps
  first: Roblox allows them in videos). Code-built pieces are a fallback, with the reason in `docs/visuals.md`.
- **Characters** (`look` skill): classic blocky bodies, very pale slightly pink skin, big fluffy hair with bangs that
  never hides the eyes, 2D anime faces that change with every line, layered detailed outfits, an accent each; evenly
  lit (`avatarAmbient`). Girl and boy leads that look like they belong in a popular Roblox story channel.
- **Light and sky** (`world` skill, "The look"): warm low afternoon sun, long crisp shadows, little flat fill, deep
  blue sky with big cumulus, saturated contrast (`applyLook`), clear days crisp to the horizon. Low cameras show the sky.
- **Surfaces** (`materials` skill): everything textured at its real size with visible grain and relief; soft things
  give way (`restOn`: beds, sofas), floors do not.
- **Places** (`world` skill): planned, not scattered: houses set back behind lawns facing the road, roads along the
  street, paths, fences with gaps, trees in yards, lamps, cars at the kerb, people walking in lanes; detailed rooms
  (Toolbox maps). Weather and time of day per shot.
- **Voice** (`voice` skill): ONE narrator on every line (one voice sample; emotion from performance, never per-mood
  samples or pitch shifts), every word clear, the hook calm and plain, "!" lines lively, a breath at every comma and a
  beat at "...", ~150–190 wpm overall with 0.35–0.45 s between lines.
- **Staging** (`camera` skill): faces never under captions; nobody inside walls, props or each other; seated people
  sink into soft seats; the camera never inside anything. `npm run collide` proves it.
- **Licences:** Roblox allows Roblox avatars and catalog items in videos, monetized too (Developer Relations, devforum.roblox.com/t/1843674, 2022): use them freely in the shorts. The downloaded FILES stay out of git (assets/roblox, fetched per machine by `npm run roblox`): videos yes, redistributing asset files no. Everything else committed is original or CC0; music is always original.

## Quality bar (every item, before every full render)

Look at stills next to the reference shorts and tick each line; anything that fails is fixed first.

1. `npm run check` passes: every take says its words clearly, one narrator (pitch within the limits), pace in range.
2. `npm run collide` (with the Roblox items, the default) says "nothing found".
3. `PlanLab` shows no overlaps; every shot's spot is a clear stage.
4. Lineup: every character has hair, a face that reads at phone size, a detailed outfit, pale skin, even light.
5. Contact sheet: no frame is washed out, blank, or a wall; sky visible in outdoor shots that look level or up;
   every surface textured; weather matches the line.
6. Captions clear of faces and app buttons on every shot (`DEBUG=1 npm run stills`).
7. The user's latest feedback (docs/feedback.md) is visibly addressed.

## Hand-over

Send the MP4. Say what is original, what was downloaded (with licences), that you checked frames by eye and the
voice with speech recognition but cannot hear it, and what is still a stand-in. Posting is the user's job.
