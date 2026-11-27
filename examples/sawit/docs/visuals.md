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

| Id | Body | Roblox items (assets/manifest.json "roblox") | Drawn fallback | Default face |
|---|---|---|---|---|
| hero | child, kid scale | Brown hair, Denim Jacket with White Hoodie, Black Jeans | green hoodie, jeans, messy hair | happy |
| grandpa | classic | Cartoony Santa Beard (white), Rice Farmer shirt and pants; procedural white buzz hair (no catalog old-man hair fits) | tee, cargo | happy |
| king | buff | dressed as an Indonesian official: a black peci (the short brimless "fez" 12968131880, tinted black: no peci in the catalog), Baju batik KORPRI (the civil servants' batik), black trousers; no beard | blue jacket, black jeans | grin, then smug |
| guards (3) | buff / tall | Medieval Hood of Mystery, Royal Knight Golden shirt and pants; guard 0 wears the golden badge he loses | black hoodie | smug |
| villagers (8) | mixed | farmer, peasant and rice-farmer clothes, template hair | tees | neutral |
| kids (4) | child | the template's kid hair and clothes | tees, shorts | determined |

Faces are anime face accessories per emotion (boy and girl sets), skin follows the face plate (look skill).
Hand props: torches (stick + code flame), Kenney lanterns and shovels, a Kenney coin as the golden badge, seed sacks
and buckets (code: no downloadable ones fit a Roblox hand).

## Locations

| Id | What | Built from |
|---|---|---|
| village | cobbled square, the King's golden statue (a BlockRig king, gold, wearing the Roblox crown) in a fountain, 8 houses facing it, stalls, carts, lanterns, the school with its sign, a swing, the planting field, a road, and sawit to the horizon on low hills | Roblox Toolbox maps: Small Medieval House (fancy texture), Small Medieval House 2, Medieval House, Village House (school); Kenney Fantasy Town (fountain, stalls, cart, lantern), Castle Kit plinth, Nature Kit palms (instanced) |
| forest | Grandpa's forest on leaf litter, his stump and lantern at the edge, sawit rows on bare soil beyond, the victim forest (s03 burning, s04 sawit), charred edge trees after s28 | Kenney Nature Kit trees, bushes, stump; Poly Haven forest_leaves_02, farm_soil, burned_ground_01 |
| palace | the castle at the end of a dirt road with banners | Roblox Toolbox "castle" (1664938359); Kenney Castle Kit flags; Poly Haven stony_dirt_path |
| room | the secret room behind the portrait: the King's map, the ledger, a heap of gold, oil barrels with the crown logo, chests, wall torches; a corridor outside | Poly Haven castle_brick_07 and planks; Kenney pirate barrels, chests, bottles, coins (instanced), furniture table and chair; drawn boards (map, ledger, portrait, logo: story text no asset has) |

Fire, smoke, embers and water spray are code (src/world/fire.ts, frame-pure shaders). Kenney's pastel foliage is
recoloured to deep greens and browns (sawit and a tropical forest).

## Materials and textures

| Surface | Texture | Source |
|---|---|---|
| square | cobblestone_floor_08 | Poly Haven |
| field, sawit soil | farm_soil | Poly Haven |
| forest floor | forest_leaves_02 | Poly Haven |
| burnt forest | burned_ground_01 | Poly Haven |
| roads | stony_dirt_path | Poly Haven |
| room walls, floor | castle_brick_07, brown_planks_04 | Poly Haven |
| grass, hills | Grass004 | ambientCG |
| sky | HDRI per time of day (day, golden, night) | Poly Haven |

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

**Roblox version**: free Toolbox maps replace two kit locations (src/world/World.ts).

| Id | Map | Placed |
|---|---|---|
| bedroom | "Random Bedroom" (9659331819): bed, gaming desk, chair, clothes rack, shelves | floor centre on the bedroom location; the hero sits on the `BigBed`'s long side; the wide shot looks from the door corner |
| street, hero's house | "Suburban House" (317197851): two storeys, flower beds, front door, garage, back-yard pool | driveway end on the sidewalk edge of the hero's lot, front to the road; the kit models in its footprint are removed |
