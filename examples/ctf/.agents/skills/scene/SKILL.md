---
name: scene
description: Build or change the 3D scene of this project in Remotion + React Three Fiber - the neon city, the plaza and vault, what each character does in each shot, and the camera. Use for anything that changes what is on screen.
---

# Scene

## Layout of `src/`

| File | What |
|---|---|
| `Root.tsx` | Registers the `Story` composition. Its length comes from `story.json` + `public/audio/timings.json`. |
| `timeline.ts` | Turns shots and audio timings into frame ranges: `shotAt(time)`, caption timings, music sections. |
| `Story.tsx` | The composition: `<ThreeCanvas>`, audio, captions, scanlines, vignette and the glitch cut. |
| `World.ts` | `buildWorld()`: the street, bakery, school, scoreboard, plaza, vault, dome, terminal, drones and lights. `update(state, time, focus)` applies the per-frame `WorldState`. |
| `layout.ts` | Where the places are. The plaza sits far away at `PX = 400`, so the street and the plaza never share a frame. |
| `characters.ts`, `wardrobe.ts`, `props.ts` | The cast (see the `look` skill). |
| `performance.ts` | Per shot: who stands where, which clips play, faces, IK, and the `WorldState` for the effects. |
| `clips.ts` | Story clips built as BlockRig keyframe clips: `walk`, `slump`, `smug`, `aim`, `type`, `cheer`, `gasp`, `celebrate`… |
| `camera.ts` | One recipe per shot: position, target, lens and shake, eased over the shot. |
| `vfx.ts` | Shaders and effects (see the `vfx` skill). |

## Rules that bite

- **Keep every frame pure.**
  - `act(person, clip, t)` calls `poseAt`, sets the face with `fade: 0` and grounds the rig.
  - Call `updateMatrixWorld(true)` on every rig before the camera reads a joint position.
  - IKControls are solved inside `update(0)`, after the clip pose.
- **Facing:** rigs face +Z, so turn them with `rig.object.rotation.y`. The hero at the terminal faces −Z (`π`).
- **Scale:** characters are about 5 studs tall, and the world is in the same units.
- **No post-processing pass.**
  - An `EffectComposer` makes Remotion capture blank frames.
  - Use `gl.toneMapping = THREE.AgXToneMapping` (exposure 1.25) instead.
  - The scanlines, vignette and glitch are CSS `AbsoluteFill`s.
- **Framing problems we hit, and their fixes:**
  - Rank tags float 1.75 studs above heads, so a close-up aimed at the head puts the face under the caption. Aim a little *below* the head, from slightly below it.
  - Headphones and hair are wide, so an over-the-shoulder shot at the terminal ends up inside the head. Use a profile shot for "typing", then a separate close-up of the screen.
  - A crowd between the camera and the hero hides the hero. Go top-down (s09) or move the crowd.
  - Check each changed shot with `node scripts/stills.mjs <ids>` before rendering.
- **Captions** are DOM text over the canvas, not 3D text.

## Adding a shot

1. Add it to `story.json` and regenerate the voice.
2. Add its camera in `camera.ts`.
3. Add its staging in `performance.ts`: places, clips, faces, and `WorldState` events.
4. Render a still of it and look at it.
