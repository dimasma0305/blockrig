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

**Find free official items** (creator Roblox, price 0) from a roblox.com page in the browser pane:
`https://catalog.roblox.com/v1/search/items/details?CreatorName=Roblox&MaxPrice=0&SalesTypeFilter=1&Limit=30&Category=<c>&Keyword=<k>`
— shirts `Category=3&Subcategory=56`, pants `Category=3&Subcategory=57`, hair `Category=1&Keyword=hair` (keep
assetType 41), dynamic heads `Category=1&Keyword=face` (bundles with bundleType 4: Man Face 949, Woman Face 948).
There are no free classic face decals: expressions come from dynamic heads (FaceControls), see `facsExpression`.

**Fetch them** (`scripts/fetch-roblox.mjs`, a loop because each item references meshes and textures):
1. List items in `assets/manifest.json` under `roblox`: `{ "heroHair": { "assetId": 376548738, "kind": "hair" }, "heroShirt": { "assetId": 382537702, "kind": "shirt" }, "boyHead": { "bundle": 949, "kind": "head" } }`.
2. `npm run roblox` downloads what it can and writes `assets/roblox/needs.json` for the rest.
3. Resolve the needs in the browser pane **on an `https://assetdelivery.roblox.com/...` page** (same origin; from roblox.com the request is blocked): `fetch("/v2/assetId/<id>", { credentials: "include", headers: format ? { "Roblox-AssetFormat": format } : {} })` → `locations[0].location`. Bundle contents come from `https://catalog.roblox.com/v1/bundles/<id>/details`, which only works from a roblox.com page. Heads need format `avatar_meshpart_head`.
4. Merge the `{ key: url }` results into `assets/roblox/locations.json` and run `npm run roblox` again. Repeat until it says "roblox items ready" (three rounds: items, then their meshes/textures/templates, then head meshes).

It writes `assets/roblox/cast.json`; `src/cast/roblox.ts` loads it, `buildCast(rb)` dresses each character (dynamic head,
hair, shirt, pants), and `act()` turns story faces into FaceControls with BlockRig's `facsExpression`.
Render with `--roblox` (`node scripts/render.mjs --roblox`, `ROBLOX=1 npm run stills`): the output is
`out/<slug>-roblox.mp4`, for the user only.

**Pitfalls:** layered hair (a MeshPart Handle with a WrapLayer, e.g. "Braided Hair") is placed by wrapping around the
head's cage, not by its attachment: pick classic hair (SpecialMesh or MeshPart without WrapLayer) unless you wire up
`addLayeredClothing({ wrap })`. Signed CDN links expire within hours: fetch soon after resolving.

`npm run check` notes any source file that loads `roblox/` so it never slips into a published render.
