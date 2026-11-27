# CTF example: "Everybody Plays CTF"

A 30-second vertical short (1080×1920, 60 fps) set in a world where everyone, from bakers to schoolkids, plays capture-the-flag hacking competitions. The cast is made with **BlockRig**; the city is built from downloaded CC0 assets (Kenney City Kit Commercial, Roads and Car Kit; Poly Haven textures) plus custom shaders and particle effects in **three.js**, all rendered by **Remotion**.

[![Everybody Plays CTF, preview](../../docs/ctf-preview.gif)](../../docs/ctf.mp4)

▶ [Watch the full video with sound](../../docs/ctf.mp4)

> *In this world, everybody plays CTF… The pros threw everything. Nothing worked. So I tried the one thing nobody did. I viewed the page source.*

## Run it

Made from [`examples/template`](../template/README.md), so it works the same way: `docs/` is the source of truth.

```sh
cd examples/ctf
npm install            # also links the library from ../.. (blockrig: file:../..)
npm run assets         # Kenney kits and Poly Haven textures (CC0) listed in assets/manifest.json
# voice: plain Node, no Python (chatterbox-js; first run downloads ~1.6 GB of models)
npm run voice          # narration from docs/story.md + docs/audio.md, timings, music
npm run check          # every take says its line, pace, captions
npm run collide        # Rapier staging check: cameras in walls, hidden faces, people in props or in each other
npm run stills         # one still per shot + out/contact-sheet.jpg
npm run render         # out/ctf.mp4
npm run preview -- --to ../../docs   # docs/ctf.mp4 + docs/ctf-preview.gif
```

**Voice.** Chatterbox (expressive, MIT) with its voice taken from a Kokoro `am_adam` sample (Apache 2.0), pitched up
×1.35; both run offline. Lines ending in "!" are performed with panic. About 160 words a minute overall, measured
against a popular short. Every take is checked with speech recognition.

**Weather and structure.** Drizzle over the neon street, a lightning storm during the attack, clear skies when the
flag is found. Towers have ledges, rooftop tanks, AC units, antennas, fire escapes and awnings; the street has
vending machines, benches, hydrants, parked cars, cables overhead and wet, textured asphalt.

## What it shows off

- **Planned, then checked.** The street is laid out on a 2D plan first (Turf: road, sidewalks, two walking lanes
  per sidewalk, a stage in front of the bakery and the school), so buildings, props, lamps and cars go only where
  they fit (`npm run stills -- --comp PlanLab 0 1`). `npm run collide` then checks every 6th frame with Rapier.
  It found 45 staging mistakes, all now fixed: walkers passing through each other and through props, a dumpster in
  a walking lane, the hero cutting through the crowd.

| BlockRig feature | Where in the video |
|---|---|
| Body shapes (`classic`, `slender`, `tall`, `buff`, `child`) and BodyColors | the baker, the kids, the pros, the crowd |
| Classic Shirt/Pants templates drawn on canvases | hoodies, numbered team jackets, a chef jacket, school uniforms, cargo pants (`src/cast/wardrobe.ts`) |
| Attachments (`HairAttachment`, `HatAttachment`, `FaceFrontAttachment`, `BodyBackAttachment`) | layered gradient hair, caps, a chef hat, headphones, visors, glasses, backpacks (`src/cast/props.ts`) |
| Welds | laptops in hands, and rank tags floating over every head |
| IKControl | the hero's hands land on the terminal keyboard |
| AnimationTrack seeking and drawn faces | every pose and expression, computed per frame |

The world, built in this project:

- **Shaders:**
  - procedural tower windows;
  - a hex force-field dome with impact ripples, an alarm, flicker and a shatter;
  - holograms with scanlines and RGB split;
  - falling glyph rain.
- **Effects and props:**
  - attack beams, GPU particle sparks, shards and confetti;
  - searchlights, drones and a live scoreboard;
  - a view-source terminal.

For agents: [`AGENTS.md`](AGENTS.md) points to the template's rules and skills ([`../template/AGENTS.md`](../template/AGENTS.md), [`../template/.agents/skills/`](../template/.agents/skills/): one per stage), kept in one place for every video, plus this video's own notes.

## Credits and licences

- **Code, story, characters, music, shaders:** original, MIT like the rest of BlockRig.
- **Voice:** generated with Chatterbox (Resemble AI, MIT; its output carries an inaudible watermark) from a Kokoro voice (Apache 2.0).
- **Models and textures:** Kenney (kenney.nl) and Poly Haven, CC0; listed in `assets/credits.json` after `npm run assets`.
- **Font:** Montserrat, SIL Open Font License, via `@remotion/google-fonts`.
