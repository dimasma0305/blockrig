# Changelog

## Unreleased

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
- 128 tests.

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
