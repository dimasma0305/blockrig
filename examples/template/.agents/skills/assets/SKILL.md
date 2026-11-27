---
name: assets
description: Find and download assets for a video BEFORE building anything in code - CC0 models (Kenney, KayKit, Quaternius via poly.pizza), HDRI skies and PBR textures (Poly Haven, ambientCG), animals, clouds, and Roblox catalog items (hair, faces, heads, layered clothing, animations, bundles) for local use through the user's signed-in browser. Use whenever a video needs any model, environment, sky, texture, animal, face, clothing or hair, and when the user wants real Roblox items or their avatar.
---

# Assets

**Assets first.** Use downloaded assets for models, environments, skies, clouds, animals, textures, faces, clothes and
hair before building anything in code; the code-built kit is only a fallback. Downloads are listed in
`assets/manifest.json` and land in git-ignored folders under `assets/`; licences stay next to them.

## Where to get each kind of asset (checked 2026-11-27, no login or API key needed)

| Need | First choice | Also | Licence |
|---|---|---|---|
| houses, suburb, roads, street lamps, fences, cars, benches, hydrants | Kenney `city-kit-suburban`, `city-kit-roads`, `car-kit` | KayKit City Builder Bits (`road_straight`, `road_junction`, `streetlight`, `bench`, `bush`, `car_sedan`, `firehydrant`); Kenney starter-kit GLBs (`building-small-a`, `road-straight-lightposts`) | CC0 |
| city buildings, shops, signs | Kenney `city-kit-commercial`, `city-kit-industrial` | KayKit `building_A`…`building_H`, `trafficlight_A`, `dumpster`, `watertower` | CC0 |
| furniture: bed, lamps, desk, sofa, TV, shelves | Kenney `furniture-kit` | Quaternius Ultimate House Interior / Furniture Pack via poly.pizza (bundles `2SXnFbwFzm`, `pgvx8Zkq8v`) | CC0 (poly.pizza: check each model) |
| trees, rocks, flowers, grass clumps | Kenney `nature-kit` | Quaternius Stylized Nature MegaKit via poly.pizza (`T34GZFA0fm`) | CC0 |
| clouds | Kenney platformer `cloud.glb` | poly.pizza Clouds `b3Kia9N2fS2`, Cumulus `5ckRCisrnXh` | CC0 / CC-BY (credit) |
| dogs, cats, farm animals | Quaternius Animated Animal Pack via poly.pizza (`ILAPXeUYiS`, Shiba Inu `y4wdQpg767` animated) | Kenney `cube-pets` | CC0 |
| birds | no verified CC0 animated bird: poly.pizza static birds (Bird `8Ph79kHbt9s`, Flying gull `eMNhHDZakYp`, Sparrow `3rTjKefT184`) and flap them in code | Khronos Fox for an animated reference | CC-BY 3.0 (credit "Poly by Google") |
| sky, sun, clouds, light | Poly Haven HDRI: `kloofendal_48d_partly_cloudy_puresky` (day), `venice_sunset`, `qwantani_dusk_2_puresky`, `rogland_clear_night`, `satara_night`, `overcast_soil_puresky`, `kiara_1_dawn` | ambientCG `EveningSkyHDRI049A`, `NightEnvironmentHDRI011` | CC0 |
| road, grass, wood, brick, fabric, concrete, tile textures | Poly Haven: `asphalt_02`, `road_damaged`, `grass_ground`, `brown_planks_04`, `brick_4`, `denim_fabric`, `brushed_concrete`, `brown_floor_tiles` | ambientCG: `Asphalt033`, `Road012A`, `Grass004`, `Bricks105`, `Planks040`, `Fabric087`, `Concrete049`, `Tiles141` | CC0 |
| faces / expressions | Roblox catalog faces (local only, see below) | BlockRig's drawn expressions (`createFace`) for published videos: no CC0 Roblox-style faces exist | — |
| clothes, hair, accessories | Roblox catalog (local only) | the drawn wardrobe and procedural hair (published videos) | — |

### How to download each (for scripts/fetch-assets.mjs)

- **Kenney packs** (zip with GLB, FBX and OBJ: use the GLB folder): GET `https://kenney.nl/assets/<slug>` keeping cookies, then GET `https://kenney.nl/download-link/<hex of "assets/<slug>">` with those cookies and `Referer: https://kenney.nl/assets/<slug>` → `{ url }` (signed, expires) → GET it. Without cookie + Referer you get `{"error":"forbidden"}`; use GET, not HEAD.
- **Kenney starter kits**: `https://raw.githubusercontent.com/KenneyNL/<repo>/main/models/<name>.glb` (repos: Starter-Kit-City-Builder, Starter-Kit-3D-Platformer, …).
- **KayKit City Builder Bits**: `https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/addons/kaykit_city_builder_bits/Assets/gltf/<name>.gltf` plus its `<name>.bin` and the shared `citybits_texture.png`.
- **Poly Haven**: list `https://api.polyhaven.com/assets?t=hdris|textures|models`; files `https://api.polyhaven.com/files/<id>` → `hdri.<res>.hdr.url`, texture maps (`Diffuse`, `Rough`, `nor_gl` at `<res>.jpg`), models `gltf.<res>.gltf.url` + its `include` map. Pin `1k` (HDRIs `2k`): 4K files are huge. Its models are photoreal: use it for skies and textures, not props.
- **ambientCG**: search `https://ambientcg.com/api/v2/full_json?type=Material&q=<q>&limit=5&sort=Popular&include=downloadData`; download `https://ambientcg.com/get?file=<Id>_1K-JPG.zip` (follows a redirect; ~10 MB each).
- **poly.pizza** (hosts Quaternius and many others; the API needs a key, the pages don't): `https://poly.pizza/m/<id>` contains `"Licence"`, `"Animated"` and the file `https://static.poly.pizza/<uuid>.glb`; bundles at `/bundle/<id>`. Licences are mixed: read and record `"Licence"` for every model; credit CC-BY ones in the video description.
- **Quaternius' own site** links to Google Drive (not scriptable): use poly.pizza instead.
- GitHub's API allows 60 requests/hour without a token: hard-code file lists in the manifest and use raw.githubusercontent.com.

## Using them

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
