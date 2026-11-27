# CTF example: "Everybody Plays CTF"

A 20-second vertical short (1080×1920, 60 fps) set in a world where everyone, from bakers to schoolkids, plays capture-the-flag hacking competitions. Everything on screen is made in code: the cast with **BlockRig**, a neon city with custom shaders and particle effects in **three.js**, all rendered by **Remotion**. Nothing is downloaded.

[![Everybody Plays CTF, preview](../../docs/ctf-preview.gif)](../../docs/ctf.mp4)

▶ [Watch the full video with sound](../../docs/ctf.mp4)

> *In this world, everybody plays CTF… The pros threw everything. Nothing worked. So I tried the one thing nobody did. I viewed the page source.*

## Run it

```sh
cd examples/ctf
npm install          # also links the library from ../.. (blockrig: file:../..)
npm run voice        # narration + synth music + timings (offline Windows SAPI voice)
npm run stills       # one still per shot + out/contact-sheet.jpg, check these first
npm run render       # out/ctf.mp4
npm run preview      # docs/ctf.mp4 + docs/ctf-preview.gif
npm run studio       # Remotion Studio, to scrub the timeline
```

**Voice.** The published video uses the Microsoft neural voice: `VOICE_ENGINE=edge npm run voice` (needs `pip install edge-tts`). That sends the narration text to Microsoft's online service.

**Pace.** Each clip is trimmed to the speech, and clips are joined with a 0.04 s gap, so the narration runs at the fast pace of viral shorts.

## What it shows off

| BlockRig feature | Where in the video |
|---|---|
| Body shapes (`classic`, `slender`, `tall`, `buff`, `child`) and BodyColors | the baker, the kids, the pros, the crowd |
| Classic Shirt/Pants templates drawn on canvases | hoodies, numbered team jackets, a chef jacket, school uniforms, cargo pants (`src/wardrobe.ts`) |
| Attachments (`HairAttachment`, `HatAttachment`, `FaceFrontAttachment`, `BodyBackAttachment`) | layered gradient hair, caps, a chef hat, headphones, visors, glasses, backpacks (`src/props.ts`) |
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

For agents: [`AGENTS.md`](AGENTS.md) holds the rules. `.agents/skills/` has one skill per stage: story, voice, look, scene, vfx, render.

## Credits and licences

- **Code, story, characters, music, shaders:** original, MIT like the rest of BlockRig.
- **Font:** Montserrat, SIL Open Font License, via `@remotion/google-fonts`.
