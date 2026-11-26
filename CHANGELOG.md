# Changelog

## 0.2.0

- **Expressions**: `createFace()` live faces with 17 built-in expressions and 21 blendable parameters, automatic blinking, `lookAt`, `talk`, fades, `face:<name>` clip markers, `rig.setExpression()`, and `rig.addFaceDecal()` / `createFaceDecal()` for any head.
- **Body types**: R6 rigs, R15 shapes (`classic`, `slender`, `buff`, `tall`, `child`, or custom), Roblox-style `height/width/depth/head` scaling, `rig.setBodyPart()`, and `toR6` / `toR15` / `retargetAll` clip retargeting.
- The head joint accepts `Head` as an alias for `Neck`.
- 73 tests, including new regression snapshots for body layouts and face drawing.

## 0.1.0

- First version: `.mesh` v2–v7 and `.rbxm` readers, mesh writer, R15 rig, skinned layered clothing, accessories, an Animator with easing, priorities, weights, fades and markers, a procedural coat, 49 tests and CI.
