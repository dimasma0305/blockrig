# AGENTS.md: "Everybody Plays CTF"

A narrated vertical short (about 20 s, 1080×1920, 60 fps) rendered with **Remotion** and **React Three Fiber**. The characters come from **BlockRig** (`../..`). Everything on screen is original and made in code: no downloaded models, textures or sounds. The video shows what BlockRig and three.js can do together:

- **Characters:** clothing templates, layered hair, welded props, IK, faces and animation tracks.
- **World:** a neon city, custom shaders and particle effects.

| Stage | Skill | Produces |
|---|---|---|
| 1. Story | `.agents/skills/story` | `story.json`: narration, captions, shot list |
| 2. Voice | `.agents/skills/voice` | `public/audio/`: trimmed narration clips, word timings, music |
| 3. Look | `.agents/skills/look` | `src/wardrobe.ts`, `src/props.ts`, `src/characters.ts`: the cast |
| 4. Scene | `.agents/skills/scene` | `src/World.ts`, `performance.ts`, `camera.ts`: world, acting, shots |
| 5. Effects | `.agents/skills/vfx` | `src/vfx.ts`: shaders, particles, beams, holograms |
| 6. Render | `.agents/skills/render` | stills, contact sheet, `out/ctf.mp4` |

```bash
npm install
npm run voice      # narration (VOICE_ENGINE=edge for the neural voice), timings, music
npm run studio     # live preview
npm run stills     # one still per shot + out/contact-sheet.jpg
npm run render     # out/ctf.mp4
npm run preview    # ../../docs/ctf.mp4 and ctf-preview.gif
```

## Rules

1. **Story first, voice second.** Shot lengths come from the measured narration (`public/audio/timings.json`), never from guesses.
2. **Keep the pace fast.** The narrator never pauses for long: clips are trimmed to the speech and joined with a 0.1 s gap, at about 3.4 words a second (205 wpm). Faster than about 4 words a second reads as rushed. Only silent reaction shots (`minSeconds`) hold.
3. **Keep every frame pure.** Every pose, particle and shader uniform is a function of the frame number:
   - Play BlockRig clips with `poseAt` (`src/lib/pose.ts`). It seeks an `AnimationTrack` by `timePosition`.
   - Use the seeded `rng()`, never `Math.random()`.
4. **Characters come from BlockRig**, and follow its Roblox-parity rules (`../../AGENTS.md`): BodyColors, Shirt/Pants templates, attachments, welds and IKControl. If a character needs something BlockRig lacks, add it to the library, with tests.
5. **Build the world here**, not in BlockRig, which only does characters.
6. **Check stills before a full render.** A full render takes minutes; a still takes seconds.
7. **Licences.** Commit only original content. Roblox catalog items may be used locally (see `../../AGENTS.md`), never in this video.

## Look defaults

- **Setting:** a neon cyber city at night. Colours: dark navy, teal `#19e3c4`, magenta `#ff2e88`, and gold `#ffd60a` for wins.
- **Rendering:**
  - AgX tone mapping at exposure 1.25, with fog for depth.
  - CSS scanlines and a vignette, plus an RGB glitch on big cuts.
  - No EffectComposer: it blanks Remotion's frames.
- **Captions:** Montserrat ExtraBold, 2–4 words, white with a black outline, and one yellow word. They sit about 64% of the way down the frame.
- **Characters:** every character has hair or headwear, a drawn shirt and pants, and at least one prop or accent colour. A plain block body looks unfinished.
