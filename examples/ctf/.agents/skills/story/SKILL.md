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

- `> narration` — one or two short sentences. End with "!" when the line should be performed with panic/energy (the voice does it). Use "..." for a beat inside a line.
- `captions:` 2–4 words each, separated by `|`, covering the narration in order; one `*word*` highlighted per caption at most.
- `action:` one action the rig can do (clips in `src/cast/clips.ts`: walk, run, sit, point, shrug, armsCrossed, lookUp, gasp, panic, slump, cheer, celebrate…). Emotion = pose + face.
- `camera:` position, tightness, at most one move; vary it every shot (wide, close, low, top-down, over-shoulder).
- `faces:` BlockRig expressions (neutral happy grin laugh smug wink determined angry furious roar shocked scared sad hurt sleepy embarrassed dazed).
- `weather:` and `time:` for every outdoor shot; `a -> b` changes across the shot (storm -> golden for relief).
- `mood:` one word, for music and colour.

`npm run docs` checks all of this (captions cover narration, faces exist, weather/time known) and fails loudly.

## Before handing off

Read the narration at speed and count words against the budget. Show the user the hook and one-line plot; let them
redirect before voicing.
