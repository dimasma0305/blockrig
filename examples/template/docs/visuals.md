# Visuals: the look bible

What the video looks like. The code follows this file; when the look changes, change it here first.

## Format

- 1080×1920, 60 fps, H.264 CRF 18. Captions at 62% of the height (debug overlay shows the band).
- Keep faces and key action out of the app zones: right 14% (buttons), bottom 16% (caption, username), top 7%.
- Cut every 1–3 s; vary the angle each cut (wide, close, low, top-down, over the shoulder).

## Palette and grade

- Bright, saturated Roblox colours by day; cool blue-grey in storms; warm orange at golden hour.
- Tone mapping: AgX, exposure from the time of day. CSS vignette 0.45. No post-processing pass.
- One accent colour per character, repeated in clothes, hair and props.

## Cast

| Id | Body | Clothes | Hair / accessories | Accent | Default face |
|---|---|---|---|---|---|
| hero | classic, kid scale | teal hoodie "{ }", jeans | messy brown hair | teal #19e3c4 | happy |
| sister | slender, kid scale | pink tee "★", shorts | pigtails with yellow ties | pink #ff7eb6 | angry |
| neighbours (4) | mixed shapes | tees / hoodies, seeded | mixed styles | seeded | neutral |

Every character needs: a body shape, drawn Shirt/Pants, hair or headwear, and one prop or accent. A plain block body looks unfinished.

## Locations

| Id | What | Built by | Notes |
|---|---|---|---|
| street | suburban street, houses set back behind lawns, few windows | `suburbanStreet()` in src/kit/structures.ts | hero's house is the first on the right |
| bedroom | kid's bedroom: bed, lamp, desk, shelf, rug, window | `room()` + props | open side faces the camera (+Z) |

## Materials and textures

Every surface has a texture at its real size (UVs are in studs). Flat colour is only for small trims and car paint.

| Surface | Texture | Notes |
|---|---|---|
| road | `asphalt` + `roadMarkings()` | cracks and patches; turns shiny when wet |
| sidewalk, paths | `sidewalk` | 4-stud slabs; gets wet |
| lawns | `grass` | blades and a few flowers |
| house walls | `siding` or `brick` | colour per house, seeded |
| roofs | `shingles` | dark colours |
| doors, fences, furniture | `wood` | planks with grain |
| bedroom walls | `plaster` | |
| bedroom floor | `wood` (or `carpet`, `tile`) | |
| bed linen, sofa | `fabric` (plaid when given an accent) | |
| rug | `carpet` | |
| lamp shade | `lampshade` | glows at night (emissive) |
| trees | `bark`, `leaves` | |

To use photo-real CC0 textures instead (Poly Haven / ambientCG), list them in `assets/manifest.json`, run `npm run assets`, and map them in `src/kit/textures.ts` (see the materials skill). Keep them stylised enough to match blocky characters.

## Weather and time of day

Set per shot in docs/story.md (`weather:`, `time:`; `a -> b` changes across the shot).

| Preset | Rain | Snow | Fog | Wet ground | Wind | Lightning |
|---|---|---|---|---|---|---|
| clear | – | – | – | – | – | – |
| drizzle | light | – | light | half | – | – |
| rain | heavy | – | some | full | light | – |
| storm | full | – | heavy | full | strong | strikes |
| snow / blizzard | – | yes | some / heavy | – | light / strong | – |

Times: day, golden, dusk, night (windows and lamps light up), storm (flat grey light).

## Camera language

- Hook shot: high and wide, moving. Reaction shots: close, still, after the line lands.
- Aim a little below a head when something floats above it, or captions cover the face.
- Never put the camera inside a model or behind a crowd that hides the hero; check with stills.
