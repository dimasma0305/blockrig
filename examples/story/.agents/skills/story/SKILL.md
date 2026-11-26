---
name: story
description: Write the story, narration and shot list (story.json) for a short made with this project. Use first, before any audio or 3D work, whenever the user wants a new video, a new story, or changes to the plot or script.
---

# Story

The format is the viral narrated Roblox-style short: 20–60 seconds, first person, an ordinary place with one strange rule. The narration never stops, the picture changes every one to three seconds, and short captions are always on screen.

## Shape

1. **Hook in the first line**, stated as a rule of the world: "In this town, …" / "In this world, …". No greeting first.
2. **Make it personal:** who the narrator is and why they break the rule.
3. **Three escalating beats**, each one clear action in one place.
4. **A silent reaction beat** (a held close-up, no narration) right after the biggest surprise.
5. **A twist that echoes the hook**, so the video loops. Leave one question unanswered for the comments.

Original stories and characters only. Use popular videos for the format, never their plots or characters.

## Budget

At the narrator's speed, plan about 2.7 words per second: 30 s ≈ 80 words and 14–18 shots. Three locations at most.

## story.json

```jsonc
{
  "title": "The Ice Statue",
  "fps": 60, "width": 1080, "height": 1920,
  "voice": { "style": "boy" },
  "music": [{ "theme": "mystery", "from": 0 }, { "theme": "happy", "fromShot": 11 }],
  "characters": { "kid": { ... }, "statue": { ... } },
  "shots": [
    {
      "id": "s01",
      "narration": "In this town, nobody touches the ice statue in the park.",
      "captions": [{ "text": "IN THIS TOWN", "highlight": "TOWN" }, ...],   // 2–4 words each, cover the narration
      "location": "park",                    // from a short list
      "action": "statue stands frozen on its plinth; kids play around it",
      "faces": { "kid": "neutral" },         // BlockRig expressions or face-image names
      "camera": "slow aerial push-in to the statue",
      "minSeconds": 2.2                       // optional: hold longer than the narration (reaction beats)
    }
  ]
}
```

- **One action per shot**, using what the rig can do: stand, walk, run, wave, point, jump, kneel, reach, fall, look. Show emotion as a pose plus an expression.
- **A silent shot** has `"narration": ""` and a `minSeconds`.
- **Every shot gets a camera note** (position, how tight, at most one move), varied from shot to shot.

Show the user the hook and a one-line plot before handing off to the voice stage.
