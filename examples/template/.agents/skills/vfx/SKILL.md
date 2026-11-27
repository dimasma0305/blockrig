---
name: vfx
description: Visual effects and shaders - glitch and flash cuts, lightning, particles (sparks, confetti, shards), beams, holograms, force fields, glows, vignette and grade, all frame-pure and without post-processing. Use when a beat needs punch, a scene looks flat, or the user asks for effects or shaders.
---

# Effects

## Rules

- **Frame-pure.** Effects are functions of time: events are *times* (`uHit = (x, y, z, startTime)`), and the shader computes age. Re-rendering any frame gives the same picture.
- **No EffectComposer** (it blanks Remotion's frames). Glow = additive sprites/meshes with `depthWrite: false` and `toneMapped: false`; grade = AgX tone mapping + exposure; vignette, scanlines, flashes and glitches are CSS layers (`src/kit/Overlays.tsx`).
- **Effects carry beats.** Tie each to a word or cut: flash on the storm (`FlashCut`), glitch on a twist (`GlitchCut`), lightning on "!" lines, confetti on the win.

## In the kit

| Effect | Where |
|---|---|
| rain, splashes, snow, fog, wet ground, lightning | `kit/weather.ts` (see the world skill) |
| sky dome with sun glow and stars, flash light | `kit/lighting.ts` |
| vignette, scanlines, glitch cut, flash cut, lightning flash | `kit/Overlays.tsx` |
| lit windows and lamps at night | `Materials.setNight` |

## Patterns to copy (from the CTF example, `../ctf/src/vfx.ts`)

Shader particle bursts (`burst(count)` with per-point velocity and `userData.at(age)`), aimed beams, hologram
material (scanlines, RGB split, glitch band), hex force-field dome (fresnel, impact ripples, shatter by hash),
procedural tower windows, glyph rain. Move a pattern into `src/kit` when a second video needs it.
