# Visuals: the look bible

## Format

1080×1920, 60 fps, H.264 CRF 18. Captions at 62% height. Faces clear of the caption band and the app zones.

## Palette and grade

Neon cyber city at night: dark navy `#060a1e`, teal `#19e3c4`, magenta `#ff2e88`, gold `#ffd60a` for wins, green
`#39ff88` for flags. AgX at exposure 1.25, scanlines 0.1, vignette 0.55, RGB glitch on s05, s07, s10, s12.

## Cast

| Id | Body | Clothes | Hair / accessories | Accent | Rank tag |
|---|---|---|---|---|---|
| hero | classic | charcoal hoodie "{ }", cargo pants | messy hair with a teal streak, headphones | teal | #8,000,000,000 (red) → #1 (gold) |
| baker | buff | chef jacket, jeans | chef hat, moustache | gold | #4,021 |
| kids (2) | child, big heads | school uniforms, shorts | pigtails / buzz + cap, backpacks | pink / cyan | #77, #78 |
| pros (4) | tall / slender | numbered team jackets (magenta) | spiky, slick, swept, bun; visors; laptops in hand | magenta | #1–#4 |
| crowd (12) | seeded | tees, hoodies, team jackets | seeded hair, glasses, headphones; laptops in s14 | teal | seeded |

## Locations

| Id | What | Built from |
|---|---|---|
| street | neon canyon along Z: shops near the street, skyscrapers further in, street lights, dumpsters, cones, traffic lights, signs, parked cars, cables overhead; bakery, school, sky scoreboard, holo billboards | Kenney City Kit Commercial (`building-a`…`j`, `building-skyscraper-a`…`e`, darkened for night, neon edges added), City Kit Roads (`light-square`, `dumpster`, `construction-cone`, `traffic-light`, `road-sign-street`, `construction-barrier`), Car Kit (`sedan`, `taxi`, `police`, `suv`). Story pieces in code: bakery, school, scoreboard, holograms, glyph rain, cables |
| plaza (x = 400) | the Vault: grid floor, hazard barriers, searchlights, hex force-field dome, terminal, drones, beams | code: these are the story's effects (`src/world/vfx.ts`) |

All downloads: `src/world/assets.ts` (names → files), `assets/manifest.json` (sources), `assets/credits.json` (licences, all CC0).

## Materials and textures

| Surface | Texture | Source |
|---|---|---|
| road | `asphalt`, darkened, wet (roughness 0.35, metalness 0.3) + neon lane lines | Poly Haven `asphalt_02` |
| sidewalks | `concrete`, darkened | Poly Haven `brushed_concrete` |
| buildings, props, cars | their own Kenney colour maps, darkened ×0.45 for night | Kenney |
| plaza floor | neon grid canvas texture | code |

## Weather and time

Night throughout. Drizzle in the city → rain at the final → storm with lightning during the attack (s05–s08) →
rain → clears when the flag is found (s12) → clear, wet streets for the ending.
