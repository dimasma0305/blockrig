---
name: assets
description: Download assets for a video - CC0 models, PBR textures and HDRI skies (Kenney, Quaternius, Poly Haven, ambientCG), and Roblox catalog items (hair, faces, heads, layered clothing, animations, bundles) for local use through the user's signed-in browser. Use when the user wants real Roblox items, their avatar, or downloaded models/textures.
---

# Assets

The template's sample needs no downloads: everything is built in code. Downloads are listed in
`assets/manifest.json` and land in git-ignored folders under `assets/`.

## CC0 (safe to publish)

| Source | What |
|---|---|
| Kenney (kenney.nl) | low-poly kits: city/suburb, furniture, holiday, nature |
| Quaternius (quaternius.com) | stylised nature, town, props |
| Poly Haven (polyhaven.com, api.polyhaven.com) | HDRI skies, PBR textures |
| ambientCG | PBR textures |

List packs under `cc0` (base URL + files), textures under `textures`, skies under `hdri`; `npm run assets`. Each
pack keeps its licence file next to it. Prefer GLB; low-poly matches blocky characters, photoreal doesn't. Load
models with GLTFLoader inside `delayRender` / `continueRender` so they never appear late in some frames.

## Roblox catalog items (local only)

They belong to Roblox and their creators: `assets/roblox/` is git-ignored; never commit them or use them in a
published or README video. The user signs in to Roblox in the browser pane themselves; never type passwords or read
cookies.

1. Add items to `roblox` in the manifest: `{ "name": { "assetId": 123, "format": "avatar_meshpart_accessory" } }` (layered clothing with cages) or `"avatar_meshpart_head"` (dynamic heads with FACS), or no format for plain assets.
2. `node scripts/fetch-roblox.mjs snippet` prints a script; run it in the browser pane on a roblox.com page (signed in). Save its JSON result as `assets/roblox/locations.json`.
3. `npm run roblox` downloads from the CDN into `assets/roblox/`.
4. Read with BlockRig: `parseRbxm`, `describeAccessory`, `describeHead`, `describeClothing`, `describeBodyParts`, `parseMesh`, `keyframeSequenceToClip`, `curveAnimationToClip`. Wear with `addAccessory`, `addLayeredClothing({ wrap })`, `setHead`, `buildBodyFromParts`.

`npm run check` notes any source file that loads `roblox/` so it never slips into a published render.
