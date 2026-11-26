# Changelog

## Unreleased

- **Roblox avatar bodies**: `createRig({ bodyParts })` builds joints from body-package rig attachments (`buildBodyFromParts`, like `Humanoid:BuildRigFromAttachments`) and fits each MeshPart to its `Size` (classic clothing is projected onto the meshes; tested on the official ROBLOX Boy and Woman packages); `describeBodyParts()` reads `R15ArtistIntent` / `R15Fixed` folders.
- **BodyColors**: `createRig({ bodyColors })`, `rig.setBodyColors()`, `describeBodyColors()`; the binary `.rbxm` reader now decodes Color3 and BrickColor properties.
- **Classic clothing**: Shirt, Pants and T-shirt images on the 585×559 template, composited per body region (body colour, Pants, Shirt, T-shirt); `rig.setClothing()`, `describeClothing()`, `templateUVs()`, `TEMPLATE`.
- **Body attachments**: `rig.addAccessory()` welds to body attachments (`BodyBackAttachment`, grips, waist, collars, feet), `rig.bodyAttachments`.
- `examples/clothing.html` and `docs/clothing.png`; `ONLY=name npm run screenshots`.
- The story example (`examples/story`): a 26-second short made with BlockRig, Remotion and three.js.
- Bundlers: version-specific three.js colour-space constants are read at run time.
- 97 tests.

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
