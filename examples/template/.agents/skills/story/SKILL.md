---
name: story
description: Write the story, narration, captions and shot list in docs/story.md for a viral Roblox-style short - the hook, escalation, twist, silent reaction beats, and per-shot action, camera, faces, weather and time of day. Use first for a new video, and whenever the plot, script or shots change.
---

# Story

## Shape

1. **Hook in the first line (2 s)**, a rule of the world: "In this town, …", "In this world, …", "Never …". No greeting.
2. **Make it personal:** one line on who the narrator is and why they break the rule.
3. **Escalate in threes:** each beat one clear action in one place, stakes rising.
4. **Silent reaction beat** right after the biggest surprise: no narration, `min: 1.2–1.6`, a face or the world reacting (storm, crowd turning).
5. **Twist that echoes the hook**, so the video loops. Leave one question for the comments.

Original stories and characters only. Use popular videos for format and pace, never their plots, characters or lines.

## Budget

Plan ~2.7 words a second overall (≈160 wpm, measured on popular shorts): 15 s ≈ 40 words / 7 shots; 30 s ≈ 80 words
/ 14 shots. Two or three locations; each costs build time.

## Writing shots in docs/story.md

The comment at the top of `docs/story.md` is the format. Per shot:

- `> narration` — one or two short sentences. Punctuate for speech: "?" rises, "..." is a beat, "!" adds energy (the mood itself comes from `emotion:`).
- `captions:` 2–4 words each, separated by `|`, covering the narration in order; one `*word*` highlighted per caption at most.
- `action:` one action the rig can do (clips in `src/cast/clips.ts`: walk, run, sit, point, shrug, armsCrossed, lookUp, gasp, panic, slump, cheer, celebrate…). Emotion = pose + face.
- `camera:` position, tightness, at most one move; vary it every shot (wide, close, low, top-down, over-shoulder).
- `emotion:` how the narrator says it, from the line's meaning (neutral, happy, excited, panic, shocked, scared, sad, serious, smug, angry, whisper). Read the story aloud in your head and mark each line; vary it, since a flat run of one mood is boring. Never use "!" just to add energy to a sad line.
- `faces:` face expressions (dynamic-head presets / face-accessory sets: neutral happy grin laugh smug wink determined angry furious roar shocked scared sad hurt sleepy embarrassed dazed).
- `weather:` and `time:` for every outdoor shot; `a -> b` changes across the shot (storm -> golden for relief).
- `mood:` one word, for music and colour.
- `light:` (optional) a lighting preset for the shot: day, golden, night, indoor, studio (world skill). Leave it out for the sky's own light.

- `speaker:` (dialogue): who says the line (me, mom, dad...). It gets that character's own voice (docs/audio.md "## Voices", voice skill) and the caption a small tag in their colour (Captions `speakers`). The narrator keeps one voice; one voice for every character was "hard to understand" (nasa video).
- `say:` how the narrator pronounces a name or acronym ("C-T-Fs", "O-S-C-P", "kurenaifu"), same word count as the line; the captions keep the real spelling. Dialogue sketches with many silent beats read slower: `npm run check` measures pace over the spoken shots only.
- In docs/audio.md "Music", `- s54: none` is silence ("the music stops").

`npm run docs` checks all of this (captions cover narration, faces exist, weather/time known) and fails loudly.

## Before handing off

Read the narration at speed and count words against the budget. Show the user the hook and one-line plot; let them
redirect before voicing.

## Make it easy to follow (the user found a jargon-heavy short "hard to understand")

- **Show the rule, don't only say it.** The hook "In this world, everyone…" gets an establishing shot of that world
  (a street where everyone does the thing, a billboard with the rule), then the hero.
- **One idea per joke, readable with the sound off.** A joke that needs insider knowledge or a chain of small actions
  (a plush swapped for a trophy in a suitcase) gets cut, or gets a visual punchline: the thing on a screen, a sign,
  a receipt. Ask "would a 12-year-old who never heard of X get it?"
- **Explain jargon on screen**: `- note: CTF = a hacking competition` (a white sticker under the title card).
- **Real things look real**: when the story names real channels, teams or brands and the user wants them shown,
  use their real avatars, logos and video thumbnails (assets skill, "Real creator images"), not drawn stand-ins.
