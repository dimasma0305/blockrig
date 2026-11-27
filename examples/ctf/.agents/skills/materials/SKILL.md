---
name: materials
description: Textures and materials for every surface - road, sidewalk, grass, brick, siding, roofs, wood, plaster, tile, carpet, fabric (beds, sofas), metal, lamp shades, windows - procedural in code or CC0 PBR downloads, at real scale. Use when anything looks flat, plastic or untextured, or when adding a new surface or prop.
---

# Materials and textures

Flat colour reads as unfinished. Every surface gets a texture at its real size; record choices in the
"Materials and textures" table of `docs/visuals.md`.

## Procedural (default, no downloads): src/kit/textures.ts

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

## Photo-real CC0 PBR (optional)

For hero surfaces, Poly Haven / ambientCG CC0 sets (colour + roughness + normal) look richer. List them under
`textures` in `assets/manifest.json`, `npm run assets` (downloads into `assets/textures/<name>/`, git-ignored, licence
kept), then load with `TextureLoader` inside a `delayRender` and use the same `studs` repeat. Keep them stylised
enough for blocky characters (low-contrast, not noisy); one or two hero surfaces, not everything.
