---
name: assets
description: Download and organise the 3D assets for this project - CC0 environment models (Kenney, Quaternius), Poly Haven HDRIs and textures, and optionally Roblox catalog items for local use. Use when the scene needs new props, a new location, a different sky, or Roblox hair/faces/heads/animations.
---

# Assets

`npm run assets` runs `scripts/fetch-assets.mjs`, which downloads everything listed in `scripts/assets.json` into `public/cc0/` (git-ignored). Each pack keeps its licence file next to it.

## Sources (CC0 only in the committed video)

| Source | What | Licence |
|---|---|---|
| Kenney (kenney.nl) | low-poly kits: nature, city/suburb, holiday (snow), furniture | CC0 |
| Quaternius (quaternius.com) | stylised nature, town, props | CC0 |
| Poly Haven (polyhaven.com, `api.polyhaven.com`) | HDRI skies, ground textures | CC0 |

Prefer glTF/GLB. When a pack only ships OBJ or FBX, convert it to GLB once and keep the converted file in `public/cc0/`. Low-poly props match the blocky characters; photoreal props don't.

To add a prop, list it in `scripts/assets.json` with its source URL and licence, run `npm run assets`, and load it with `useAsset()` from `src/lib/assets.ts`.

## Roblox items (optional, local only)

BlockRig can wear real Roblox hair, heads and face decals and play Roblox animations. Those belong to Roblox and their creators, so:

- Fetch them with the user's own signed-in session for personal use. Use the asset delivery endpoint in a browser, then download from the CDN.
- Keep them in `public/roblox/`. That folder is git-ignored.
- Never commit them, and never use them in the README video.
- Read them with BlockRig's own loaders: `parseRbxm` / `describeAccessory` / `describeHead` / `keyframeSequenceToClip` / `parseMesh`.

`src/characters.tsx` picks them up automatically when `public/roblox/manifest.json` exists. Otherwise it uses the original look: BlockRig bodies, drawn expressions and procedural hair.
