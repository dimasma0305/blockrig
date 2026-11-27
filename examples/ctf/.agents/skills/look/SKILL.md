---
name: look
description: Design and build the cast's look - BlockRig bodies, drawn Shirt/Pants templates, layered hair, hats, glasses, headphones, backpacks, laptops, rank tags. Use whenever a character looks plain, needs new clothes or hair, or a new character is added.
---

# Look: making BlockRig characters interesting

A bare rig is a set of flat-coloured blocks. Every character here gets five layers, and each one is cheap.

## The five layers

### 1. Body

- Build it with `createRig({ shape, scale, bodyColors })`.
- Shapes: `classic`, `slender`, `tall`, `buff`, `child`. Vary them across a crowd.
- Children get `scale: { head: 1.15 }`.
- Skin tones come from `SKINS` in `characters.ts`.

### 2. Clothes, drawn as Roblox templates

`src/wardrobe.ts` paints 585×559 canvases in the classic Shirt/Pants layout. Pass them as `clothing: { shirt, pants }`; BlockRig composites them onto each limb the way Roblox does.

- **Helpers:**
  - `cloth()`: base colour, shading toward the edges, fabric grain.
  - `band()`: cuffs, hems, stripes.
  - `seam()`.
  - `text()`: chest prints, numbers on the back.
- **Shirts:**
  - `hoodie`
  - `teamJacket`: number on the back, team name on the chest.
  - `chefJacket`
  - `uniformShirt`: with a tie.
  - `tee`
- **Pants:** `cargo`, `jeans`, `shorts`.
- **Shoes:** `shoes()` draws sneakers on the feet.

Shade every face of the template a little differently and darken the edges. Flat fills look like untextured blocks.

### 3. Hair

- `hair(style, colour, { streak, seed, tie })` in `src/props.ts` builds a clump of boxes. It has a colour gradient from root to tip (vertex colours) and an outline hull.
- Styles: `messy`, `swept`, `spiky`, `slick`, `pigtails`, `bun`, `afro`, `buzz`.
- Attach it to `HairAttachment`.
- A coloured streak or hair tie gives a character an identity colour.

### 4. Accessories, by attachment as in Roblox

Use `rig.attachTo(object, attachmentName, offset)`:

| Item | Attachment |
|---|---|
| Hats, headphones | `HatAttachment` |
| Glasses, visors | `FaceFrontAttachment` |
| Backpacks | `BodyBackAttachment` |

### 5. Held props, by weld

- `rig.weld(laptop, "RightHand", { c0 })` uses Weld C0 semantics.
- Hands reach exact points with `rig.addIKControl({ type: "Position", chainRoot: "RightUpperArm", endEffector: "RightHand", pole })`. The hero types on the terminal keyboard this way.

Wrap every prop in `outlined()` (a backface hull) so it matches the rig's outline.

## Faces

- `createFace({ expression, seed })` draws a live face.
- Change it per shot with `face.set(expression, { fade: 0 })` in `performance.ts`.
- Expressions used here: `neutral`, `happy`, `grin`, `sad`, `determined`, `shock`, `smug`.

## Checklist for a new character

- A distinct silhouette: a different shape, hair style or hat from the characters next to it.
- One accent colour, shared by hair, clothes and props.
- Readable from 10 studs away. Test it in a line-up still before using it in shots.
