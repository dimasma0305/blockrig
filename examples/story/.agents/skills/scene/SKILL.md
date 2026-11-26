---
name: scene
description: Build or change the 3D scene of this project in Remotion + React Three Fiber - BlockRig characters and their animations and faces, the environment, camera shots, captions and post effects. Use for anything that changes what is on screen.
---

# Scene

## Layout of `src/`

| File | What |
|---|---|
| `Root.tsx` | Registers the `Story` composition. Its length is computed from `story.json` + `public/audio/timings.json`. |
| `timeline.ts` | Turns the shots and audio timings into frame ranges: `shotAt(frame)`, caption timings and the music sections. |
| `Story.tsx` | The composition: `<ThreeCanvas>`, the audio tracks, captions, the shot cut flash. |
| `World.tsx` | The environment: ground, park, trees, props, sky/HDRI, fog, snow, lights. |
| `characters.tsx` | BlockRig rigs for the cast, built once per canvas, plus their faces and accessories. |
| `performance.ts` | What each character does in each shot: clips, positions, faces, look targets. |
| `camera.ts` | One camera recipe per shot: position, target, lens, eased moves. |
| `clips.ts` | Story-specific BlockRig clips (kneel, reach, stand up, trip). |
| `Captions.tsx` | Word-synced captions. |
| `lib/` | `rng`, asset loading with `delayRender`, the Animator seek helper. |

## Rules that bite

- **Frame-pure animation.** Compute every pose from `useCurrentFrame()`. To play BlockRig clips, call `poseAt(rig, layers, t)`. It builds a fresh Animator state for time `t` by stepping from 0, so the result doesn't depend on the order frames are rendered in.
- **Models that load late never appear** unless loading blocks the render. Use `useAssetsReady()` and `delayRender`.
- **Character facing:** BlockRig rigs face +Z. Turn `rig.object.rotation.y` to aim, and use `nudgeJoint("Neck", …)` for looking.
- **Scale:** characters are about 5.2 studs tall; build the world in the same units. A door is about 7 studs.
- **No post-processing pass.** An `EffectComposer` (from @react-three/postprocessing) takes over the render loop and Remotion captures blank frames. Instead: set `gl.toneMapping = THREE.AgXToneMapping` (exposure about 1.15) and `antialias: true` on the renderer, and draw the vignette as a CSS radial-gradient `AbsoluteFill` over the canvas.
- **Framing checks:** the statue is wide, so side cameras near it end up inside its arms. Prefer front three-quarter shots from +z and check each changed shot with `node scripts/stills.mjs <ids>`.
- **Captions** are DOM text over the canvas, not 3D text. Fonts come from `@remotion/google-fonts` (`loadFont` blocks rendering until the font is ready).

## Adding a shot

1. Add it to `story.json` and regenerate the voice.
2. Add its camera in `camera.ts`.
3. Add each character's clips, place and face in `performance.ts`.
4. Render a still of its middle frame.
