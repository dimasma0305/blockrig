---
name: world
description: Build the locations and atmosphere - structure (houses, rooms, streets, props), weather (rain, storm, lightning, snow, fog, wet ground) and time of day (day, golden, dusk, night, storm). Use when a place looks empty or flat, when adding a location, or when the user asks for weather, mood or atmosphere.
---

# World: structure and atmosphere

## Assets first

Buildings, roads, lamps, fences, trees, cars, furniture, clouds, birds and skies come from downloaded assets
(`assets` skill: CC0 model kits, Poly Haven HDRI skies with real sun and clouds, PBR textures). Place them with
GLTFLoader inside `delayRender`. The code builders below are the fallback when no asset fits; say why in docs/visuals.md.

```ts
// src/world/assets.ts lists names -> files; Video.tsx loads them (useAssetLibrary) before the canvas mounts
const house = lib.model("building-type-a", { scale: 15 });        // Kenney city kits: 1 unit = 15 studs
const bed = lib.model("bed", { scale: 5.5 });                       // Kenney furniture: ~5.5
const dog = lib.model("dog", { height: 2.6 }); lib.pose(dog, "Walk", local); // fit by size; glTF animation, frame-pure
scene.background = lib.sky("day");                                  // Poly Haven HDRI (also PMREM for reflections)
const grass = lib.pbr("grass", { repeat: [w / 6, d / 6] });         // PBR set at real size
```

**Local Roblox version (`--roblox`): free Toolbox maps.** A house, a room or a street someone built in Roblox looks
more like the reference shorts than any kit. Add it to `assets/manifest.json` (`{ "mapHouseA": { "assetId": 317197851,
"kind": "map" } }`), fetch it with the Roblox loop (`assets` skill), and draw it with `buildRobloxMap` (src/kit/robloxMap.ts):
parts, wedges, corner wedges, balls, cylinders, mesh modifiers, MeshParts with their textures, decals, textures and
lights, merged per material, with the CC0 PBR sets for surface detail. Then:

1. `ROBLOX=1 npm run stills -- --comp MapLab <frames>`: each map gets a full orbit (quarter turns show which way a
   house faces) and a look from inside. Read sizes and names off `assets/roblox/<map>/map.json`.
2. Place it in `World.ts` the way `ROBLOX_ROOM` and `ROBLOX_HOUSE` do: anchor a known point (a room's floor centre;
   the end of a house's driveway on the sidewalk edge), turn its front towards the camera or road, remove the kit
   models inside its footprint, and find props with `map.find(/BigBed/)` (a Box3) to stand characters on them.
3. Keep the kit version working: it is what the public render uses.

Unions (CSG) are drawn as their bounding shape; prefer maps built from parts and MeshParts. A map whose front yard
sits in the hero's spot pushes him into flower beds: anchor the lot edge, not the facade.

Measure an unknown model first: `node scripts/asset-sizes.mjs assets/kenney/<kit>/<model>.glb` (size, animations).
Keep cameras on the inside of fences and hedges, or leave the hero's own lot open.

## Structure fallback (src/kit/structures.ts)

Scale: a character is ~5 studs, a door ~7, a storey ~10. Everything is seeded and textured.

| Builder | Gives you |
|---|---|
| `suburbanStreet({ length, perSide, seed, M })` | road with markings, curbs, sidewalks, lawns, houses set back with paths, fences, mailboxes, trees, bushes, parked cars, lamp posts, power poles and wires, hydrant, bins. Returns `houses[]` with door spots. |
| `house(M, { w, d, floors, wall, wallTex, roof, door, garage, seed })` | walls, gable shingle roof, chimney, door with knob, porch with posts, framed windows with curtains (lit at night), garage |
| `room(M, { w, d, h, wall, floor, floorColour })` | floor, three walls (open side to the camera), ceiling, skirting, window |
| props | `bed`, `tableLamp` (with light), `floorLamp`, `desk` (lit monitor), `chair`, `sofa`, `tv`, `shelf` (books), `rug`, `tree`, `bush`, `fence`, `lampPost`, `mailbox`, `car`, `bench`, `hydrant`, `trashBin`, `powerPole` + `wires` |

Rules: no empty boxes. A street needs layers (road, curb, sidewalk, lawn, fence, house, roofline, sky) and clutter
at character height. A room needs a bed/sofa, a light source, a rug, something on the walls and a window. Put
locations far apart (`LOCATIONS` in src/world/World.ts) so they never share a frame. New builders go in the kit.

## Weather (src/kit/weather.ts)

Per shot in docs/story.md: `weather: clear | overcast | fog | drizzle | rain | storm | snow | blizzard`, plus
`lightning 0.3 1.1` (strike times in the shot), numbers to scale (`rain 0.5`), and `a -> b` to change across a shot.

- Rain streaks, ground splashes and snow are shader particles that follow the camera (one draw call each, frame-pure).
- Wet ground: `applyWetness` makes road/sidewalk/grass darker and shinier; set `wet` with rain.
- Fog: `applyFog` thickens with fog/rain/snow, coloured by the sky.
- Lightning: a light flash in 3D + `LightningFlash` overlay + sky flash; add camera shake on the strike.
- A lone cloud over one character: a second `createWeather({ area: 3 })` updated `at` that spot (see the sample's s07).
- Indoors, weather is switched off (only visible through windows).

## Time of day (src/kit/lighting.ts)

`time: day | golden | dusk | night | storm` (or `a -> b`): sky gradient dome with sun glow and stars, sun with soft
shadows, sky fill, exposure. Night/overcast lights windows and lamps (`Materials.setNight`).

## Layout: plan in 2D first (src/kit/plan.ts, Turf)

Lay a location out on a flat (x, z) blueprint before anything becomes 3D, so placement follows real rules instead
of hand-tuned offsets:

1. **Zones** (keep-outs): road, crossing, sidewalks, paths and driveways, and a **stage** for every spot where a
   character acts and the cameras stand (the hero's lawn and the ground between it and the road). Nothing is placed
   on a zone unless `except` names it (cars on the road, lamps on the sidewalk).
2. **Areas**: lots, yards, rooms: where things may go.
3. **Footprints**, biggest first: `plan.place(name, rect(x, z, w, d, angle))` returns false when it would overlap,
   so the kit house, tree or car is simply not added. A Roblox map reserves its whole lot (`force`), and the kit
   models around it make room on their own.
4. **Fillers**: `plan.scatter(yard, { count, radius, gap, rng })` for trees and bushes, `plan.along(a, b, step)` for
   fences, hedges and lamps (gaps appear where paths and the stage are).

`world.plan.conflicts()` lists overlaps that were forced; PlanLab (`npm run stills -- --comp PlanLab 0 1`, add
`ROBLOX=1` for the local version) draws every zone and footprint over the real street from above. Adding a location:
give it its own plan and a stage for each of its shots.

## Check

`npm run stills -- --comp WeatherLab 0` (and other frames) for weather; PlanLab for the layout; stills of every
outdoor shot; then `npm run collide` (review skill): it finds cameras inside walls, faces hidden behind trees or
poles, and characters inside props or floating.
