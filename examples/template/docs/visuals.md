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

**Local Roblox version** (`--roblox`, never published): free official catalog items, listed in `assets/manifest.json`.

| Id | Head (expressions via FaceControls) | Hair | Shirt | Pants |
|---|---|---|---|---|
| hero | Man Face (bundle 949) | Brown Charmer Hair | Teal Shirt | Black Jeans with Sneakers |
| sister | Woman Face (bundle 948) | Belle Of Belfast Long Red Hair | Pastel Starburst Top with Gray Jacket | Jean Shorts with White Shoes |
| neighbours | Man / Woman Face | Brown Hair, Pal Hair, Blonde Spiked Hair, Straight Blonde Hair | Blue Plaid, I <3 Pizza, Green Jersey, ROBLOX Jacket | Black Jeans, Dark Green Jeans, Ripped Skater Pants, Jean Shorts |

Hair, faces and clothes are listed in `assets/manifest.json` under `roblox` (anime face accessories per expression,
dynamic heads for FaceControls). The table shows the roles; the manifest has the current ids.

## Locations

| Id | What | Built from |
|---|---|---|
| street | suburban street: houses set back behind lawns, picket fences, trees, planters, street lights, a stop sign, parked cars; clouds and birds overhead; a dog | Kenney City Kit Suburban (`building-type-*`, `fence`, `tree-*`, `planter`), City Kit Roads (`road-straight`, `road-crossing`, `light-curved`, `road-sign-stop`), Car Kit (`sedan`, `suv`, `taxi`), Kenney platformer `cloud`; poly.pizza bird (CC-BY, credit) and Shiba Inu (Quaternius, CC0, animated). The hero's house is the third on the right; its yard has no fence |
| bedroom | kid's bedroom, open towards the camera | Kenney Furniture Kit: `wall`, `wallWindow`, `bedSingle`, `pillow`, `bear`, `sideTable`, `lampRoundTable`, `desk`, `computerScreen`, `chairDesk`, `bookcaseOpen`, `books`, `rugRectangle`, `pottedPlant` |

All of them: `src/world/assets.ts` (names → files), `assets/manifest.json` (sources), `assets/credits.json` (licences).

## Materials and textures

Downloaded models bring their own textures (Kenney colour maps). Large surfaces use CC0 PBR sets:

| Surface | Texture | Source |
|---|---|---|
| road | Kenney road tiles (markings included) | City Kit Roads |
| sidewalks, front paths | `concrete` | Poly Haven `brushed_concrete` |
| lawns, ground | `grass` | ambientCG `Grass004` |
| bedroom floor | `planks` | Poly Haven `brown_planks_04` |
| sky and reflections | HDRI per time of day | Poly Haven `kloofendal_48d_partly_cloudy_puresky` (day), `qwantani_dusk_2_puresky` (golden), `overcast_soil_puresky` (storm), `rogland_clear_night` (night) |

Code-built fallbacks (`src/kit/structures.ts`, `src/kit/textures.ts`) are not used in this video.

## Weather and time of day

Set per shot in docs/story.md (`weather:`, `time:`; `a -> b` changes across the shot).

| Preset | Rain | Snow | Fog | Wet ground | Wind | Lightning |
|---|---|---|---|---|---|---|
| clear | – | – | – | – | – | – |
| drizzle | light | – | light | half | – | – |
| rain | heavy | – | some | full | light | – |
| storm | full | – | heavy | full | strong | strikes |
| snow / blizzard | – | yes | some / heavy | – | light / strong | – |

Times: day, golden, dusk, night, storm: each picks its HDRI sky (background + reflections); the sun light follows the time for shadows. Rain, splashes, lightning, fog and wet ground are code (they follow the camera).

## Camera language

- Hook shot: high and wide, moving. Reaction shots: close, still, after the line lands.
- Aim a little below a head when something floats above it, or captions cover the face.
- Never put the camera inside a model or behind a crowd that hides the hero; check with stills.

**Local Roblox version** (`--roblox`): free Toolbox maps replace two kit locations (src/world/World.ts).

| Id | Map | Placed |
|---|---|---|
| bedroom | "Random Bedroom" (9659331819): bed, gaming desk, chair, clothes rack, shelves | floor centre on the bedroom location; the hero sits on the `BigBed`'s long side; the wide shot looks from the door corner |
| street, hero's house | "Suburban House" (317197851): two storeys, flower beds, front door, garage, back-yard pool | driveway end on the sidewalk edge of the hero's lot, front to the road; the kit models in its footprint are removed |
