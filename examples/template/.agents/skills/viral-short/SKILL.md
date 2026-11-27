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
2. **look / world / materials** → `docs/visuals.md`, then `src/cast`, `src/world`. Check `Lineup`, `MaterialBoard`, `WeatherLab`.
3. **voice** → `docs/audio.md`, `npm run voice`, `npm run check`.
4. **camera / vfx** → `src/direction`, effects. Stills after every change.
5. **review / render** → contact sheet, full render, frame sheet from the MP4, report.

For a first version, shrink everything (5–7 shots, ~15 s) rather than skip a stage. The user's reaction to a real
video is worth more than questions up front.

## Defaults users asked for (keep them unless told otherwise)

- **Voice:** expressive young male narrator (Kokoro `am_adam` pitched ×1.35, performed by Chatterbox). ~160 wpm overall, short gaps, never rushed. Lines ending in "!" sound panicked/excited.
- **Characters:** classic blocky Roblox look, but never plain: drawn clothes, hair or hat, an accent colour, accessories. Expressive faces that change with the story.
- **Places:** suburban houses with few windows set back behind lawns; real structure (roofs, porches, fences, trees, lamps, power lines, cars); people in the street.
- **Surfaces:** every surface textured (road, sidewalk, grass, walls, roofs, wood, fabric, carpet, lamp shades).
- **Atmosphere:** weather and time of day per shot (rain, storm with lightning, snow, fog, golden hour, night).
- **Framing:** faces never under captions or floating tags; nothing blocking the hero.
- **Assets:** original or CC0 in anything committed or published; Roblox catalog items only locally.

## Hand-over

Send the MP4. Say what is original, what was downloaded (with licences), that you checked frames by eye and the
voice with speech recognition but cannot hear it, and what is still a stand-in. Posting is the user's job.
