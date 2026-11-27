---
name: look
description: Design and build the cast - BlockRig bodies, drawn Shirt/Pants templates, layered hair, hats, glasses, headphones, backpacks, held props, faces. Use whenever a character looks plain, needs new clothes or hair, or a new character is added; check with the Lineup composition.
---

# Look: characters that are never plain

**Assets first:** real Roblox items from the catalog (`assets` skill, local videos only): dynamic heads (Man Face,
Woman Face) whose expressions come from FaceControls (`facsExpression("sad")`, same names as the drawn faces), free
official hair, classic shirts and pants. `npm run roblox`; renders use them by default. The drawn wardrobe and procedural hair below are the fallback for videos
that will be published or committed, where catalog items can't be used.

A bare rig is flat-coloured blocks. Every character gets five layers (all in `src/cast/`), recorded in the Cast
table of `docs/visuals.md` first.

1. **Body** — `createRig({ shape, scale, bodyColors })`. Shapes: `classic`, `slender`, `tall`, `buff`, `child` (kids also `scale: { head: 1.15 }`). Vary shapes in a crowd. Skin tones from `SKINS`.
2. **Clothes as Roblox templates** — `src/cast/wardrobe.ts` paints 585×559 Shirt/Pants canvases (`clothing: { shirt, pants }`), composited by BlockRig like Roblox. Garments: `hoodie(base, accent, logo, seed, back)`, `teamJacket`, `chefJacket`, `uniformShirt`, `tee(base, print)`, `cargo`, `jeans`, `shorts`; `shoes()` draws sneakers. Shade and grain every face; flat fills look untextured.
3. **Hair** — `hair(style, colour, { streak, seed, tie })`: messy, swept, spiky, slick, pigtails, bun, afro, buzz. Root-to-tip gradient + outline. A streak or tie colour = identity.
4. **Accessories by attachment** (as in Roblox) — `rig.attachTo(obj, "HatAttachment" | "HairAttachment" | "FaceFrontAttachment" | "BodyBackAttachment", offset)`: caps, headphones, glasses, visors, backpacks.
5. **Held props by weld** — `rig.weld(obj, "RightHand", { c0 })`. Hands reach exact points with `rig.addIKControl({ type: "Position", chainRoot, endEffector, pole })`.

Wrap every prop in `outlined()` so it matches the rig's outline. Layered clothing (`addLayeredClothing`) hides the
body under it automatically (HSR), so nothing pokes through.

## Faces

`createFace({ expression, seed })`; per shot `faces:` in docs/story.md, applied by `act()` in performance.ts.

## Real Roblox items

Hair, heads, faces, clothing and bundles from the catalog can be worn (see the `assets` skill) for local videos only.

## Checklist

- Distinct silhouette from neighbours (shape, hair, hat). One accent colour across hair, clothes, props.
- Readable at 10 studs. `npm run stills -- --comp Lineup` and look before using a new character.

## The reference look (user's references, 2026-11-27)

Characters, from https://www.youtube.com/shorts/Xd_yEnAdiGo:
- classic blocky bodies, very pale slightly pink skin (girls `#fcf3f0`, boys `#f0cdb0`), detailed layered outfits;
- big fluffy anime hair with bangs and volume, never hiding the eyes;
- 2D anime faces (big highlighted eyes, small mouth, blush) that change every line; shocked = blank white eyes and
  an open mouth. Roblox face accessories per emotion (`faceSets`, first choice); drawn faces only when none are downloaded;
- evenly lit, like Roblox's strong avatar ambient: `avatarAmbient()` (kit/lighting.ts) on every character, so faces
  stay readable in shade.
Light, sky and surfaces: see the world skill ("The look").
