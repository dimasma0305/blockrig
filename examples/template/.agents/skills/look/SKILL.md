---
name: look
description: Design and build the cast - whole Roblox avatars from packs by id (body packages, dynamic heads, outfits, animation packs), BlockRig bodies, drawn Shirt/Pants templates, layered hair, hats, glasses, headphones, backpacks, held props, faces. Use whenever a character looks plain, needs new clothes, hair or a whole new avatar, or a new character is added; check with the Lineup composition.
---

# Look: characters that are never plain

## Avatars from whole Roblox packs (first choice)

Build a character from a whole Roblox pack by its id instead of item by item: a body package, a dynamic head with
its mood, an outfit bundle, an animation pack, or any single catalog item.

1. Find the id on the Roblox site: `roblox.com/bundles/<id>/...` is a bundle (`bundle:<id>`), `roblox.com/catalog/<id>/...`
   an item (`asset:<id>`), `roblox.com/users/<id>/profile` a player whose whole avatar you want (`user:<id>`, or
   `user:<username>`), and an outfit id `outfit:<id>`. A body package bundle (Korblox Deathspeaker 192) or a player's
   avatar brings its body colours and scales too. Free official ones: Man Face 949, Woman Face 948, Rthro Animation Package 356, Stylish
   Animation Pack 83. Bundle contents are public: `https://catalog.roblox.com/v1/bundles/<id>/details`.
2. `npm run pack -- bundle:<id> <name>` (assets skill, "Whole Roblox packs by id"): cached once on this machine,
   reused by every video, copied into the git-ignored `assets/roblox/packs/`.
3. In `src/cast/`: `const packs = usePacks()` (src/cast/packs.ts), then
   - a whole avatar: `rigFromPack(packs.boy, { outline: 0.035, shadows: true, bodyColors })`: its body parts, head
     (a dynamic head keeps its FaceControls expressions), accessories (layered clothing fitted to the body through its
     cages, rigid ones on their attachments) and classic clothing;
   - mix and match: build the rig from one pack, then `wearPack(rig, packs.outfit)` for another pack's accessories
     and clothing; your own `clothing` / `bodyParts` options win over the pack's;
   - Roblox's own movement: `packs.rthro.clip("idle" | "walk" | "run" | "jump" | "fall" | "climb" | "swim")` as a
     layer in `act()` / `poseAt` (the heaviest clip of the slot; `packs.rthro.clips.idle` lists them all);
     a dynamic head's mood is `packs.boy.clip("mood")`.
4. Look at it before using it: Sandbox (`clip: "rthro:run"`, review skill) and `npm run stills -- --comp Lineup`.
5. Still `avatarAmbient(rig.object)` on every character, and the skin set to the face plate colour when a face
   accessory paints one (below).

A pack that comes back with "Authentication required" needs the user signed in to roblox.com in the browser pane.
Packs are Roblox's and their creators': the files never go in git (the cache lives in the user's home folder).

**Assets first:** whole packs (above), or real Roblox items from the catalog one by one (`assets` skill): dynamic heads (Man Face,
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

Hair, heads, faces, clothing and bundles from the catalog can be worn: one by one (`npm run roblox`, `assets` skill)
or as whole packs by id (`npm run pack`, above). Roblox allows them in videos; the files stay out of git.

## Held things (torches, flags, swords, tools)

Hold them the Roblox way, never with a hand-made weld rotation (a hand-rolled rotation held torches backwards):
model the handle +Y up and -Z forward, `rig.equipTool(handle, { grip })` (Humanoid:EquipTool: RightGripAttachment
and Tool.Grip; `grip.pos` is the point of the handle in the fist), and play BlockRig's `clips.toolHold` on top of
the shot's clip (Roblox's "toolnone": right arm forward; only that arm is keyed, so walking still plays). In that
pose the handle stands upright. With the arm hanging, a Roblox grip points the handle backwards: that is why the
pose is needed. Small things carried low (a bucket, a lantern, a sack) are welded to the hand hanging down.

## Checklist

- Distinct silhouette from neighbours (shape, hair, hat). One accent colour across hair, clothes, props.
- Readable at 10 studs. `npm run stills -- --comp Lineup` and look before using a new character.

## The reference look (user's references, 2026-11-27)

Characters, from https://www.youtube.com/shorts/Xd_yEnAdiGo:
- classic blocky bodies, very pale slightly pink skin (girls `#fcf3f0`, boys `#f0cdb0`), detailed layered outfits;
- big fluffy anime hair with bangs and volume, never hiding the eyes;
- 2D anime faces (big highlighted eyes, small mouth, blush) that change every line; shocked = blank white eyes and
  an open mouth. Roblox face accessories per emotion (`faceSets`, first choice); drawn faces only when none are downloaded.
  Roblox-accurate: face textures are drawn untouched; many paint a face plate in the skin tone they were made for
  (catalog items come in "White" / "Light" versions), so the character's skin is set to that plate colour (measured
  on load, `plate`), as a player wears the face that matches their skin. Most anime "faces" are whole head
  shells (1.2 studs, FaceCenterAttachment) built around the classic head; BlockRig's head has the same shape
  (`HEAD_CORNER`), so separately bought hair and faces fit like a set. A face that floats or shows a second skin tone
  means a shape mismatch: measure the mesh (size, attachment) before blaming the texture;
- evenly lit, like Roblox's strong avatar ambient: `avatarAmbient()` (blockrig/video) on every character, so faces
  stay readable in shade.
Light, sky and surfaces: see the world skill ("The look").
