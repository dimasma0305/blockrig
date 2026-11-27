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

## Check

`npm run stills -- --comp WeatherLab 0` (and other frames) for weather; stills of every outdoor shot; nothing
blocking the camera (trees, poles, fences are easy to hide behind).
