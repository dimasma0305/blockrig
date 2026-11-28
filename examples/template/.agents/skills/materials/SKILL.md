---
name: materials
description: Textures and materials for every surface - road, sidewalk, grass, brick, siding, roofs, wood, plaster, tile, carpet, fabric (beds, sofas), metal, lamp shades, windows - procedural in code or CC0 PBR downloads, at real scale. Use when anything looks flat, plastic or untextured, or when adding a new surface or prop.
---

# Materials and textures

Flat colour reads as unfinished. Every surface gets a texture at its real size; record choices in the
"Materials and textures" table of `docs/visuals.md`.

## Downloaded first

Use CC0 PBR textures (Poly Haven, ambientCG: colour + roughness + normal) for road, grass, wood, brick, fabric,
concrete and tiles, listed in `assets/manifest.json` and fetched by `npm run assets`. Downloaded models usually bring
their own textures: keep them. The procedural painters below are the fallback (offline, or nothing suitable).

## Procedural fallback: src/kit/textures.ts

`TEXTURES` holds painters for: asphalt (cracks, patches), sidewalk (4-stud slabs), grass (blades, flowers), dirt,
brick, siding, shingles, wood (planks, grain), plaster, tile (checker with an accent), carpet, fabric (weave; plaid
with an accent), metal (brushed), bark, leaves, lampshade. Plus `roadMarkings()` and `windowTexture(lit)`.

- Each has a real size in studs (`studs`), roughness, optional bump.
- Structures use **UVs in studs** (`box()`, `cyl()` in structures.ts), so `Materials.surface(name, { base, accent })` repeats correctly on faces of any size. Use those helpers for new props instead of raw `BoxGeometry`.
- Colour variants: `{ base: "#hex", accent: "#hex", seed }`. Materials are cached per name+options.
- Ground materials registered with `surface(name, opts, true)` get wet in rain.
- Painters must be seeded (`rng`), never `Math.random()`: each render tab draws its own copy.

Add a texture: a painter in `TEXTURES` (paint at 256 px over `studs` studs), then check `npm run stills -- --comp MaterialBoard`.

## Typical choices

| Thing | Texture |
|---|---|
| bed: frame / mattress / blanket / pillow | wood / fabric white / fabric with accent (plaid) / fabric |
| lamp | metal base, `lampshade` shade (emissive at night) |
| sofa, chair | fabric |
| floor | wood, carpet, tile |
| walls inside / outside | plaster / siding or brick |
| roof | shingles |
| road, sidewalk, lawn | asphalt + markings, sidewalk, grass |

## Using downloaded PBR sets

Poly Haven / ambientCG CC0 sets (colour + roughness + normal) are the default for every large surface. List them under
`textures` in `assets/manifest.json`, `npm run assets` (downloads into `assets/textures/<name>/`, git-ignored, licence
kept), then load with `TextureLoader` inside a `delayRender` and use the same `studs` repeat. Keep them stylised
enough for blocky characters (low-contrast, not noisy).

## How surfaces behave (blockrig/video `surfaceOf`/`restOn`)

Materials are also physical: how far a body sinks in. Beds, mattresses, blankets 0.35 studs; pillows and cushions
0.45; sofas 0.3; snow 0.3; sand and mud ~0.12; grass 0.06; carpet and rugs 0.04; floors, roads, wood, stone 0.
`surfaceOf(label, robloxMaterial)` looks it up by name (Kenney asset, Roblox model/part) or by Roblox material
(Fabric, Snow, Sand, Mud, Grass). New soft prop (beanbag, hammock, trampoline...)? Add it to the table, so staging
(`restOn`) and the collision check agree on it.
