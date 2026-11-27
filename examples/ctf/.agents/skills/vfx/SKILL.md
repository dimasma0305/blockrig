---
name: vfx
description: Shaders and effects for this project - the hex force-field dome, holograms, glyph rain, beams, particle bursts, searchlights, glows, glitch cuts. Use when adding or changing an effect, or when a scene looks flat.
---

# Effects

All effects live in `src/vfx.ts` and `src/World.ts`, and all of them are pure functions of time:

- `tick(root, time)` walks the scene and sets `uTime` on every material that has it.
- Nothing advances on its own between frames.

| Effect | How |
|---|---|
| `domeMaterial` | A hex grid with a fresnel rim and a scanning band. Uniforms: <br>• `uHit[8]`: impacts (xyz plus start time), drawn as expanding ripples. <br>• `uShatter`: discards hex cells by hash. <br>• `uAlarm`: tints it red. <br>• `uFlicker`: breaks it up before it falls. |
| `hologramMaterial` | A canvas texture with scanlines, a moving glitch band, RGB split and an edge glow. Additive, with no depth write. |
| `towerMaterial` | Procedural lit windows (a hash per cell) and distance fog, both in the shader, so each tower costs one draw call. |
| `glyphRainMaterial` | Columns of glyphs from a canvas atlas, falling at per-column speeds. |
| `beam(colour, r)` | A cylinder aimed with `userData.aim(from, to)`, with an additive core and halo. |
| `burst(count, opts)` | GPU particles. Each point stores its own velocity and seed, and `userData.at(age)` sets the age uniform. Sparks, shards and confetti all use it. |
| `glow()`, `searchlight()` | Additive sprites and cones, for light you can see. |

## Rules

- **Glow:** use additive blending with `depthWrite: false` for anything that glows. Add `toneMapped: false` when it must stay saturated under AgX.
- **Events are times, not state.** A hit 0.4 s into a shot is `uHit[i] = (x, y, z, shotStart + 0.4)`, and the shader works out its age. Rendering any frame again gives the same picture.
- **No post-processing.**
  - Glow comes from sprites and additive layers.
  - Glitch cuts are CSS in `Story.tsx` (`GlitchCut`).
- **Effects carry the story beats.** The dome flashes on each hit (s07), flickers on failure (s08) and shatters when the flag is found (s12). Tie each effect to a narration word.
