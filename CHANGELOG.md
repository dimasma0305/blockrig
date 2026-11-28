# Changelog

## 0.3.0

BlockRig's purpose is now making Roblox-style story videos fast and good: the characters plus the rest of the video.

- **`blockrig/pack`: whole Roblox packs by id.** `resolvePack("bundle:356", store)` works out a bundle (or a single asset) from what is cached and lists what to fetch next. `loadPack` turns it into rig parts, head, accessories (layered ones fitted), clothing, clips by slot (Roblox's own animation-pack slots and weights) and maps. `rigFromPack` / `wearPack` dress a rig. **`blockrig/pack/cache`** keeps one disk cache for every video (`~/.cache/blockrig/roblox`): bundle details come from the public catalog, asset files come from links the signed-in browser provides (`locateScript`, `addLinks`), and `exportPack` copies a pack next to a video. `describeMap` moved here from the template. The template has `npm run pack`, `usePacks()` and a Sandbox `clip: "<pack>:<slot>"`. Checked end to end on the real Rthro Animation Package (bundle 356).

- **`blockrig/video`**: a new entry point (`src/video/`, typed in `src/video/index.d.ts`) with the shared parts of every story short, moved out of the video template and tested: `createTimeline` / `speakersOf` (voice-timed shots and captions, speaker tags), `rng` and easing, `poseAt` / `groundRig` (frame-pure posing), camera recipes and `applyCamera`, `createLighting` / `TIMES` / `mixDaylight` / `avatarAmbient` / `applyLook`, `surfaceOf` / `restOn`, `buildRobloxMap` (Roblox parts, wedges, mesh modifiers, MeshParts, NormalId decals, lights, solid colliders), `createProbe` / `loadRapier` (the Rapier staging check), boards (`panel`, `text`, `pic`, `videoCard`, `browserWindow`, `banner`, `poster`, `standee`) and `loadImages`. Framework-free: the video passes in Rapier, canvases and images.
- Fixes made on the way: the staging check skips things whose parent is hidden and scales map colliders with their group, and the probe has `free()` so it can be rebuilt per shot. Roblox maps merge their parts without `three/examples`, so they also work on three r128.
- `examples/template` imports these from `blockrig/video`; its `src/kit` keeps only what needs React, Remotion or post-processing, and its own look. `examples/ctf`, `examples/sawit` and `examples/nasa` keep their own kit copies.
- **Every problem from the videos' feedback logs is fixed in the library**, with a test each (README: "Problems found while making videos"):
  - **`blockrig/voice`** (new, no dependencies): `matchScore` / `spellNumbers` (takes saying "$5,000" or "11" count as right), `moodOf` / `EMOTIONS` / `emotionSettings` (one narrator for every mood, "!" panics), `voiceOf` (a voice per speaker), `judgeTake` / `maxTakeSeconds` (words, then pitch, then length; babble capped), `alignWords` / `estimateWords`, `medianPitch` (YIN), `trimToSpeech`, `addPauses` (silence at commas and stops, never inside a word), `pace`, `pitchReport`, `wordTimeProblems`, `musicSections` (`none` = silence).
  - **Fixed while moving it:** the voice scripts' YIN walked past the dip and read every voice about 7% low.
  - **Found on the first full run:** a take judged against the voice sample could still fail `npm run check`, which compares with the median of the finished takes. `pitchReport` now returns `outliers`, and the template's voice script re-voices them against the median (new seeds; the better take is kept).
  - **`blockrig/video`**: `Plan` (the layout plan, now without Turf), `layer` / `groundConflicts`, `lightsByLocation`, `compileStory` / `checkStory` (the docs checks), `trimUnion` (desk and table top unions no longer cover the chair: `buildRobloxMap` trims them by default and lists them in `map.dropped`), a seated character is no longer "inside" its own chair, and `check(camera, cast, { captions })` reports `caption-over-face`. `groundRig` records `seated`.
  - The template's `npm run collide` passes the caption band while a caption is showing, so `caption-over-face` is reported. On its own sample story it found two real cases (s01: the caption over the back of the hero's head; s07: over the sister's head).
  - `examples/template` uses the library's plan and ground layers (its `kit/plan.ts` and `kit/ground.ts` are gone), and its scripts run on the library: `docs.mjs` is `compileStory` (same story.json as before, also on nasa's 66 shots), `check.mjs` uses `pace` / `pitchReport` / `wordTimeProblems`, `voice.mjs` uses `trimToSpeech` / `estimateWords` / `musicSections` (same timings and music files), and `voice-js/make_voice.mjs` uses the moods, voices, take judging, pitch, word times and pauses. Takes now record `yin: 2`, and the check never compares them with takes measured by the old pitch tracker. Its skills point at `blockrig/video` and `blockrig/voice` instead of the removed kit files.
- README, AGENTS.md and package.json describe the new purpose; `package.json` `exports` has `./video` and per-entry `types`.

Also in this release, for the characters:

- **Head shape matches Roblox's classic head**: the top and bottom edges are rounded with a 0.29-stud radius (`HEAD_CORNER`), measured from catalog face accessories built as shells around that head. With the old, tighter rounding the head poked through those shells near the edges and showed as a two-tone "mask". `headGeometry(height, radius, corner)`.
- Meshes with non-finite vertices load safely: the triangles using them are dropped (one old v3 hair carried a NaN vertex).
- **Accessories are drawn at the size their handle draws them**: `describeAccessory` returns `scale` and `offset` (SpecialMesh.Scale / Offset, or a MeshPart's Size / InitialSize) and `addAccessory(mesh, { attachment, map, scale, offset })` applies them before the weld. Old beards, hats and hair were drawn at the mesh file's own size: Andrew's Beard (Scale 0.55) came out nearly twice as big, its mustache over the eyes.
- **Elbows and knees bend like Roblox's R15 block rig**: limb parts now reach past their joints and overlap, with the sizes measured from Roblox's R15 block rig (UpperArm 1.169 tall, 0.251 past the elbow; LowerArm 0.267 above it; legs likewise: `R15_OVERLAP`). Parts used to end exactly at each joint, so every bend opened a wedge-shaped gap. Classic clothing templates still split at the joints. Tested.
- **`clips.toolHold`**: Roblox's "toolnone" hold (right arm forward, only that arm keyed). With `rig.equipTool` (Roblox's grip), a handle modelled +Y up stands upright in it; with the arm hanging it points backwards, which is how torches came out reversed. Tested.
- Mesh normals are normalised on load (one beard shipped normals 0.3 to 1.7 long).
- **The head never shows through a face accessory any more** (a mouth cut into two triangles): face shells are low-poly, and between their vertices the flat facets dipped up to 0.02 studs inside the smooth head. `addAccessory` now lifts every FaceCenterAttachment shell off the head by its own deepest facet dip plus 0.01 (at least `FACE_LIFT`, 0.03; real catalog faces: 0.03 to 0.08), solved so each facet's centre clears the head, and face accessories (FaceCenter/FaceFront) also draw with a depth offset towards the camera.

- Removed the "Ice Statue" story example (`examples/story`, `docs/story.mp4`); "Everybody Plays CTF" and the video template remain.

- **CurveAnimation checked against Roblox Studio**: a CurveAnimation built and saved in Studio 0.748 decodes key for key, and evaluates to Studio's own values (float curves within 1e-6, rotations within 0.0003°). The blobs and Studio's values are a test fixture (`test/fixtures/studio-curves.json`, with the script that made them).

- **Smaller things**: `createRig({ shadows })` / `rig.setShadows(cast, receive)` (outlines never cast; later parts follow); `rig.clone(over)` rebuilds a rig the same way (welded objects cloned, live face shared unless given); `rig.dispose()` frees what the rig made and leaves your textures and welded props; `rig.update(dt)` runs faces and IK without an Animator; three.js `BufferGeometry` is accepted wherever a parsed mesh is (`meshFromGeometry`); legacy BrickColor BodyColors are read (`BRICK_COLORS`, `brickColorHex`, palette from rbx-dom, MIT).

- **HipHeight**: `rig.hipHeight` measures Humanoid.HipHeight from the body (R6: 0) and can be set to raise or lower the body.
- **IKControl**: `rig.addIKControl({ type, chainRoot, endEffector, target, pole, weight, priority, offset })` for Position, Rotation, Transform and LookAt chains, with part or attachment end effectors; solved after the Animator (`rig.solveIK()`). `examples/ik.html`, `docs/ik.png`.

- **Welds and tools**: `rig.weld(object, part, { c0, c1 })` (Weld: Object = Part * C0 * C1^-1), `rig.attachTo(object, attachment, objectAttachment)` (RigidConstraint), `rig.equipTool(handle, { grip })` / `unequipTool()` (Humanoid:EquipTool's RightGrip weld with `Tool.Grip`), `rig.partCFrame(name)`, `rig.welds`, `rig.unweld()`, and `describeTool()` for gear `.rbxm` files. Body attachments carry orientations; grip attachments default to the standard -90° about X. Checked with Roblox's Linked Sword on the ROBLOX Boy, R6 and R15 bodies.
- The story example welds its props with `rig.weld` (frames unchanged).

- **CurveAnimation import**: `curveAnimationToClip()` (and `keyframeSequenceToClip()`, which hands CurveAnimations on) reads joint folders with `Vector3Curve` positions, `EulerRotationCurve` (RotationOrder) or `RotationCurve` rotations, `MarkerCurve`s and FaceControls `FloatCurve`s, and samples them into a clip. Key blobs (`ValuesAndTimes`) follow the community layout in rbx-dom#657 (not yet checked against a Studio export); `decodeFloatCurve` / `decodeRotationCurve` / `decodeMarkerCurve`, `evalFloatCurve` / `evalRotationCurve`.
- Readers: string properties that aren't valid UTF-8 come back as raw bytes (BinaryString), and `.rbxmx` BinaryStrings are base64-decoded.

- **Layered clothing fit (WrapLayer → WrapTarget)**: body parts take their `WrapTarget` cage (`bodyParts[name].cage`, read by `describeBodyParts`), and `rig.addLayeredClothing(mesh, { wrap })` fits a garment to the body by matching its inner cage to the body cages through their template UVs, then skins it on the rig's bind pose. Layers stack by `Order` (each fits to the outer cage of the one below). `fitLayer()`, `cageMap()`, `cageKey()`; `describeAccessory()` returns the WrapLayer origins and the SurfaceAppearance ColorMap. Checked with Roblox's Zip Hoodie, Knit Sweater and Casual Sweats on the ROBLOX Boy and Woman bodies.
- Garment bones named `Root`, `HumanoidRootNode` and `Head` map to the rig's root and neck.

- **AnimationTrack**: `animator.loadAnimation(clip)` and `animator.play()` return Roblox-style tracks: `play(fadeTime, weight, speed)`, `stop(fadeTime)`, `adjustSpeed` (negative plays backwards), `adjustWeight(weight, fadeTime)`, settable `timePosition`, `looped`, `priority`, `length`, `isPlaying`, `weightCurrent` / `weightTarget`, `getTimeOfKeyframe`, `getMarkerReachedSignal(name)` (with the marker's value), and `stopped` / `ended` / `didLoop` / `keyframeReached` signals; `animator.getPlayingAnimationTracks()`.
- **Behaviour change (parity)**: a fade's time is now the time to go from the current weight to the target, as in Roblox (it was a rate of one full weight per fadeTime). Markers fire in time order. Imported markers carry `kind: "marker" | "keyframe"`.
- The story example poses frames with `timePosition` and `update(0)` instead of reaching into the Animator.

- **Dynamic heads (FACS)**: `parseFacs()` reads a head mesh's FACS block (bone and control names, quantized pose matrices, 2- and 3-pose correctives); `rig.setHead()` with such a mesh makes a dynamic head driven by `rig.faceControls` (Roblox's 50 FaceControls) and `rig.applyFaceControls()`; the head texture is layered over HeadColor3. Checked on the official Woman Face and Man Face heads.
- **Face animation**: `keyframeSequenceToClip()` imports FaceControls NumberPoses (mood animations), and the Animator blends face controls by priority and weight.
- `.rbxm` reader: Float64 properties (NumberPose.Value).
- Fixes: meshes with a degenerate LOD table (`[0, 0]`) rendered nothing; `setHead()` and body parts modified the parsed mesh they were given, so a mesh shared by several rigs went wrong.

- **Roblox avatar bodies**: `createRig({ bodyParts })` builds joints from body-package rig attachments (`buildBodyFromParts`, like `Humanoid:BuildRigFromAttachments`) and fits each MeshPart to its `Size` (classic clothing is projected onto the meshes; tested on the official ROBLOX Boy and Woman packages); `describeBodyParts()` reads `R15ArtistIntent` / `R15Fixed` folders.
- **BodyColors**: `createRig({ bodyColors })`, `rig.setBodyColors()`, `describeBodyColors()`; the binary `.rbxm` reader now decodes Color3 and BrickColor properties.
- **Classic clothing**: Shirt, Pants and T-shirt images on the 585×559 template, composited per body region (body colour, Pants, Shirt, T-shirt); `rig.setClothing()`, `describeClothing()`, `templateUVs()`, `TEMPLATE`.
- **Body attachments**: `rig.addAccessory()` welds to body attachments (`BodyBackAttachment`, grips, waist, collars, feet), `rig.bodyAttachments`.
- `examples/clothing.html` and `docs/clothing.png`; `ONLY=name npm run screenshots`.
- The story example (`examples/story`): a 26-second short made with BlockRig, Remotion and three.js.
- Bundlers: version-specific three.js colour-space constants are read at run time.
- 135 tests.

## 0.2.0

- **Import real Roblox animations**: `keyframeSequenceToClip()` turns a `KeyframeSequence` from a `.rbxm` into a clip. Pose CFrames become joint Transforms (rotation and translation), with Pose.Weight, PoseEasingStyle/Direction (legacy Cubic quirk, CubicV2), Loop, Priority, named keyframes and KeyframeMarkers; R6 poses are converted out of the classic C0 frames.
- **Roblox head shapes**: `describeHead()` reads a head asset's SpecialMesh (MeshId, Scale, Offset) and its attachment Vector3Values; `rig.setHead()` places it by its `NeckRigAttachment`, and accessories then weld to the new head's own attachments; `rig.headBounds()`.
- **More Roblox formats**: `.mesh` v1.00/v1.01 (text; v1.00 half scale, flipped UVs) and XML `.rbxmx` models (`parseRbxmx`, auto-detected by `parseRbxm`).
- The Animator plays quaternion poses, per-joint translations (`rig.setJointOffset`) and pose weights.
- **Expressions**: `createFace()` live faces with 17 built-in expressions and 21 blendable parameters, automatic blinking, `lookAt`, `talk`, fades, `face:<name>` clip markers, `rig.setExpression()`, and `rig.addFaceDecal()` / `createFaceDecal()` for any head.
- **Body types**: R6 rigs, R15 shapes (`classic`, `slender`, `buff`, `tall`, `child`, or custom), Roblox-style `height/width/depth/head` scaling, `rig.setBodyPart()`, and `toR6` / `toR15` / `retargetAll` clip retargeting.
- **Face decals, Roblox-style**: `createFace({ images })` swaps face images instantly, like replacing a Head `face` Decal's Texture; optional crossfade, `images.blink`, and fallback to procedural faces. `face:<name>` markers use the same instant swap.
- **AGENTS.md**: the Roblox-parity rule, a mechanism map (parity / approximation / extra) and the known differences; `CLAUDE.md` points agents at it.
- The head joint accepts `Head` as an alias for `Neck`.
- 85 tests, including new regression snapshots for body layouts and face drawing.

## 0.1.0

- First version: `.mesh` v2–v7 and `.rbxm` readers, mesh writer, R15 rig, skinned layered clothing, accessories, an Animator with easing, priorities, weights, fades and markers, a procedural coat, 49 tests and CI.
