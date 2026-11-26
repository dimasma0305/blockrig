# AGENTS.md: how to work on BlockRig

BlockRig reproduces how **Roblox** builds, dresses and animates characters, in three.js. The rule for every change is:

> **Do it the way Roblox does it.** Find the Roblox mechanism first (engine class, property, formula, file format) and implement *that*, with Roblox's names, units, axes and defaults. Only invent something when Roblox has no equivalent. Then make it opt-in and label it as a BlockRig extra.

A change that "looks right" but works differently from Roblox is a bug, even if it renders fine.

## Scope: characters only

BlockRig is a **character** library. Everything in it serves building, dressing, posing, animating and expressing a Roblox-style character. The world around the character is the app's job, built with plain three.js.

**In scope**
- Rigs and bodies: R15 and R6, body shapes and scaling, body-part meshes, Roblox head shapes.
- Clothing and accessories: layered clothing, hair, hats and face accessories, attachment welds.
- Animation: KeyframeSequence import, the Animator (easing, priorities, weights, fades, markers), retargeting.
- Faces: face Decals, Dynamic Heads (FACS) when added, and the procedural expressions extra.
- The file formats those need: `.mesh`, `.rbxm` / `.rbxmx`, reading only the instances that belong to a character or an accessory.

**Out of scope (don't add these to the library)**
- Environments: Parts and maps, Terrain, materials, `Lighting`, `Sky`, `Atmosphere`, water, place (`.rbxl`) loading.
- Physics, collisions, Humanoid movement and controllers, cameras, networking, game logic, UI.
- Props that aren't worn or held by a character. A held tool or weapon attached to a hand is in scope; a tree is not.

Examples, demos and tests may build a simple scene around a character, but those helpers stay in `examples/`. If a request is about the world rather than the character, say that it's out of scope for BlockRig and suggest doing it in the app or a separate package.

## Before you change anything

1. **Name the Roblox mechanism** the change relates to, for example `Motor6D.Transform`, `Humanoid:AddAccessory`, `Decal` on `Head`, `AnimationTrack:Play(fadeTime, weight, speed)`.
2. **Read the source of truth.** Use the Roblox Creator docs (`create.roblox.com/docs/reference/engine/...`). Then use the community format specs listed in the README. Put the URL in a code comment next to the implementation.
3. **Match Roblox's behaviour by default.** That covers defaults (fade 0.1 s, weight 1, speed 1), enum names (`EasingStyle`, `AnimationPriority`), evaluation order and edge cases. If the docs leave something unspecified, say so in a comment (`// Roblox docs do not specify …; we assume …`).
4. **Write a parity test** that pins the Roblox behaviour: a formula, a default, an order of operations. Put Roblox's name for the behaviour in the test title.
5. **Anything without a Roblox equivalent** must be opt-in (an option or a separate function), be marked "BlockRig extra" in JSDoc and the README, and never change the default behaviour of a Roblox-equivalent path.

## Mechanism map

Keep this table current. **Parity** means it behaves like Roblox. **Approximation** means the same idea with known differences, listed below. **Extra** means Roblox has no such thing.

| Roblox mechanism | BlockRig | Status |
|---|---|---|
| R15 rig: 15 parts, joint hierarchy (`LowerTorso`, `UpperTorso`, …) | `createRig()` / `buildBody({ shape: "classic" })`, bone names = part names | Parity |
| R6 rig: `Torso`, `Left Arm`, …; shoulder and hip pivots | `createRig({ rigType: "R6" })` | Parity |
| `Motor6D`: `Part1 = Part0 · C0 · Transform · C1⁻¹`; animation writes `Transform` | `motor6D()`; joints pose by a `Transform` delta on top of the bind pose | Parity (see note 1) |
| `Humanoid:BuildRigFromAttachments()`: joints from `*RigAttachment` pairs | `buildBodyFromParts()` / `createRig({ bodyParts })`: each joint where the parent's and child's `<Joint>RigAttachment` meet; built-in shapes use joint positions (`buildBody`) | Parity for body packages (note 2) |
| Body packages: MeshParts in `R15ArtistIntent` / `R15Fixed` with `OriginalSize`, `MeshId`, `TextureID`, attachments; mesh fitted to `Size` | `describeBodyParts()` + `createRig({ bodyParts })` | Parity (attachment rotations ignored, note 2) |
| `BodyColors`: `HeadColor3`, `TorsoColor3`, `Left/RightArmColor3`, `Left/RightLegColor3` | `createRig({ bodyColors })`, `rig.setBodyColors()`, `describeBodyColors()` | Parity (Color3; legacy BrickColor numbers not mapped) |
| Classic clothing: `Shirt.ShirtTemplate`, `Pants.PantsTemplate`, `ShirtGraphic.Graphic` on the 585×559 template, composited over the body colour (Pants, then Shirt, then T-shirt on the torso front) | `createRig({ clothing })`, `rig.setClothing()`, `describeClothing()`, `templateUVs()` | Approximation: projected onto body meshes and blocky parts alike (note 8) |
| `Humanoid:AddAccessory()`: weld so `Handle = Part · BodyAtt · HandleAtt⁻¹` | `rig.addAccessory()` / `accessoryWeld()`, head and body attachments (`rig.bodyAttachments`) | Parity (blocky bodies place body attachments on part faces, note 8) |
| Head assets: `SpecialMesh` (FileMesh, `MeshId`, `Scale`, `Offset`) plus the head's own attachment Vector3Values; the head is placed by its `NeckRigAttachment` | `describeHead()` + `rig.setHead()`; later accessories weld to the new head's attachments | Parity (classic heads without the values fall back to a 0.6-stud centre) |
| Layered clothing: `WrapLayer` (inner `ReferenceMeshId` + outer `CageMeshId`, origins, `Order`) fitted to `WrapTarget` cages, then skinning | `rig.addLayeredClothing(mesh, { wrap })` with `bodyParts[*].cage`, `fitLayer()`, `cageMap()` | Approximation (note 3) |
| `.mesh` v1–v7 (v1 text with v1.00 half scale; LODs, bones, subsets, skinning, FACS) | `parseMesh()` / `writeMesh()` | Parity (v7 Draco via hook) |
| Binary `.rbxm` (chunks, LZ4/ZSTD, interleaved encodings) and XML `.rbxmx` | `parseRbxm()` (auto-detects XML), `parseRbxmx()`, `describeAccessory()` | Parity for the supported property types |
| `KeyframeSequence` → `Keyframe(Time, Name)` → `Pose(CFrame, EasingStyle, EasingDirection, Weight)`, `KeyframeMarker` | `keyframeSequenceToClip(parseRbxm(bytes))` → clip with per-joint quaternion + translation, Pose.Weight, `KeyframeReached` / marker events | Parity for binary `.rbxm` (note 4) |
| `CurveAnimation` (FloatCurve / RotationCurve / Vector3Curve) | not imported yet | Missing |
| `EasingStyle` Linear / Constant / Cubic / Elastic / Bounce + `EasingDirection` | `ease(style, dir, t)` | Parity (curves follow TweenService; note 5) |
| `Animator:LoadAnimation`, `AnimationTrack` (`Play/Stop(fadeTime)`, `AdjustSpeed`, `AdjustWeight(w, fadeTime)`, `TimePosition`, `Looped`, `Priority`, `Length`, `IsPlaying`, `WeightCurrent/Target`, `GetTimeOfKeyframe`, `GetMarkerReachedSignal`, `KeyframeReached`, `Stopped`, `Ended`, `DidLoop`), `GetPlayingAnimationTracks` | `animator.loadAnimation()` / `play()` -> `AnimationTrack` (camelCase), `Signal.connect()` | Parity (note 6) |
| Body scaling `BodyHeightScale` / `BodyWidthScale` / `BodyDepthScale` / `HeadScale` | `createRig({ scale })` | Approximation (note 7) |
| `BodyTypeScale` / `BodyProportionScale` (Rthro blending) | `shape: "slender" | "buff" | "tall" | "child"` | **Extra**: not Roblox's tables (note 7) |
| Classic face: a `Decal` named `face` on `Head`, `Face = Front`; changing the expression = replacing its `Texture` (instant) | `createFace({ images })` + `rig.addFaceDecal()` / head wrap; `set(name)` swaps instantly | Parity |
| Dynamic heads: FACS (`FaceControls` properties driving head bones; 2- and 3-pose correctives) | `parseFacs()`, `rig.faceControls` + `applyFaceControls()`, face NumberPoses in `keyframeSequenceToClip()`, Animator blending | Parity for translation FACS (note 9) |
| Procedural drawn expressions (`EXPRESSIONS`, `drawFace`, parameter blending, auto-blink, talk) | `createFace()` without images | **Extra** |
| Crossfading face images | `set(name, { fade })` | **Extra** (opt-in) |
| R15 ⇄ R6 clip retargeting | `toR6` / `toR15` | **Extra**: Roblox plays nothing across rig types |
| Procedural coat `makeCoat()`, outline shader | | **Extra** (test fixture / style) |

### Known differences (fix these toward parity when you touch them)

1. **Joint axes.** In Roblox, `Pose.CFrame` / `Motor6D.Transform` act in the joint frame given by `C0`. On the standard R15 rig the RigAttachments are axis-aligned, so that frame equals the character's axes. BlockRig always expresses rotations in character axes, converting through each bone's bind rotation. A rig whose C0 frames are rotated would differ. If you add `.rbxm` rig import, carry C0/C1 through and apply `Transform` in the C0 frame.
2. **BuildRigFromAttachments.** Body packages (`bodyParts`) build joints from the `*RigAttachment` positions, as Roblox does. Attachment *rotations* are ignored (avatar rig attachments are axis-aligned), and the built-in `shape` presets still take joint positions directly.
3. **Layered clothing.** Cages correspond through their template UVs (checked on real items: a UV names one spot, never shared between body parts, and the garment/body offsets mirror left and right). BlockRig moves each inner-cage vertex onto the target vertex with the same UV and carries the garment by inverse-distance weighting (1/d^4) of its 6 nearest inner-cage vertices; Roblox's own solver is not published and may differ in detail. Each layer is pushed out 0.015 studs per layer along its normals so layers and body don't poke through; `ShrinkFactor`, `Puffiness` and `AutoSkin` are not applied. Fitted garments are skinned on the rig's bind pose with their own weights. Without body cages (BlockRig's blocky bodies), garments are skinned as they come, which suits bodies close to the reference proportions. A body without a head cage leaves hood and collar vertices to follow their neighbours.
4. **Poses.** Imported clips carry each Pose's full CFrame (quaternion `q` plus translation `p`, applied as the Motor6D `Transform`) and `Weight`. R15 poses are taken as character-axis rotations because the standard R15 RigAttachments are axis-aligned. R6 poses are converted out of the classic rotated C0 frames (`R6_C0_ROTATIONS`, community-documented values). Legacy `EasingStyle.Cubic` plays with its direction reversed, as the Roblox runtime does (`CubicV2` doesn't); pass `cubicLegacy: "named"` to turn that off. How `Pose.Weight` mixes is not documented, so BlockRig multiplies it into the track weight. Hand-written clips may still use Euler `r`. Prefer importing over hand-authoring.
5. **Easing curves.** Roblox doesn't document the exact Elastic and Bounce formulas or the Cubic direction quirk (`CubicV2`). BlockRig uses the TweenService-style curves. Verify against Studio when possible.
6. **Blending.** Per-joint priority override and slerp weight averaging follow the commonly documented behaviour. Roblox doesn't publish the exact blend maths.
7. **Scaling.** BlockRig scales joint positions about the feet. Roblox scales each part's `OriginalSize` and attachment `OriginalPosition`, then rebuilds joints, and uses `R15_TO_RTHRO_NORMAL` / `SLENDER` tables for body type and proportion. The `shape` presets are BlockRig's own proportions, not Roblox data.
8. **Clothing on R15 bodies.** Roblox composites classic clothing into per-limb textures that R15 body meshes are UV-mapped to (each limb's parts share one UV square: upper part on top, lower part below, hand or foot at the bottom). That composite layout isn't published, so BlockRig projects the template onto every body part instead: each triangle takes the template face its normal points to, and its height down the limb (or torso) picks the row, split between the parts by their heights. Checked against the official ROBLOX Boy and Woman packages with Roblox-made clothing; seams can differ from Roblox's on rounded meshes. If the composite layout becomes known, map mesh UVs to it instead. Default body attachments on blocky bodies sit on the part faces (front/back of the torso, bottom of the hands and feet); a body package's own attachments replace them. A body part's `TextureID` is drawn under the clothing, over the body colour.
9. **Dynamic heads.** BlockRig poses a FACS head by moving each vertex by its skinned bones' summed offsets (all control columns times their values, correctives as the product of their controls), which equals skinning when the face bones only translate, as on the official heads checked (*Woman Face*, *Man Face*: 59 `trans_only_joint`s). The rx/ry/rz matrices are parsed but not applied; heads whose FACS rotates bones need real skinning about each bone's pivot. Controls clamp to 0..1. Download dynamic heads with the `Roblox-AssetFormat: avatar_meshpart_head` header to get the MeshPart (with FACS) rather than the static SpecialMesh fallback.

## Conventions (all Roblox's)

- Units are **studs**. **Y up.** Characters **face −Z**. Right-handed. BlockRig turns the whole rig 180° (the `stage` group) so it faces a three.js camera; everything inside is Roblox space.
- CFrame rotation matrices are **row-major** `R00..R22`; their columns are `RightVector`, `UpVector` and `ZVector` (`LookVector = −ZVector`). Use `cframeToMatrix` / `matrixToCFrame`; never hand-roll the transpose.
- Use Roblox's names everywhere they exist: part and joint names, `HairAttachment`, `HatAttachment`, `Priority` values, `EasingStyle` and `EasingDirection` names, `Looped`.
- Default values must match Roblox's: `Play(fadeTime = 0.1, weight = 1, speed = 1)` and `Stop(fadeTime = 0.1)`.

## Assets

- **Never commit Roblox assets** to this repo or the npm package. That covers catalog meshes, textures, face decals, animations, and Roblox's own body parts. Tests and screenshots use generated content (`makeCoat`, `writeMesh`, procedural faces).
- APIs take assets from the caller (`parseMesh(bytes)`, `createFace({ images })`). Documentation may explain how to fetch assets for personal use, with a note about Roblox's Terms of Use and creators' rights.

## Tests and releases

- `npm test` must pass on Node 20/22/24 × three r128/r184 (CI does this).
- Behaviour changes need a unit test. Intentional output changes need `npm run test:update`, and the snapshot diff has to be reviewed in the PR.
- Re-render README images with `npm run screenshots` when visuals change.
- Bump the version in `package.json` and `src/index.js`, add a `CHANGELOG.md` entry, then tag `vX.Y.Z` to publish (see `.github/workflows/release.yml`).
