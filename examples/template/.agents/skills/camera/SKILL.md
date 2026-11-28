---
name: camera
description: Stage the acting and frame the shots - performance.ts (who stands where, clips, faces) and camera.ts recipes (push-in, crane, orbit, follow, low angle, top-down, shake), with the framing mistakes to avoid. Use when adding or changing a shot, or when a still shows a bad frame.
---

# Acting and camera

## Acting (src/direction/performance.ts)

Per shot: `place(person, x, z, rotY)` then `act(person, layers, local, face, ground, contacts)`. Rigs face +Z;
`facing(from, to)` gives the rotation. Layers are BlockRig clips (`src/cast/clips.ts`) with `at` (start offset),
`fade`, `weight`, `speed`; `poseAt` seeks them so any frame is exact. Contacts: `FEET` (standing), `ON_SEAT` (sitting
on furniture: hips on the seat, legs hang). New action → add a clip, check it in PoseLab. Roblox's own walk, run,
idle, jump, climb and swim come from an animation pack (`packs.rthro.clip("run")`, look skill): use them as layers
like any clip.
**Soft things give way** (blockrig/video `surfaceOf`/`restOn`): a body sinks into a bed, sofa or pillow and a little into grass,
never into a floor. Put a character on a surface with `restOn(top, "bed")`, not the raw top: hips sink ~0.35 studs
into a mattress, which is what makes them look seated rather than perched on a board.

## Frame by faces first (blockrig/video `frame`)

For any shot of people, say where their faces go instead of placing the camera by hand:
`frame([head(hero.rig), head(sister.rig)], { from: V(-1, 0.06, 0), fov: 56, faceY: 0.34, size: 0.07 })`.
It works out the camera distance and height that put every face at `faceY` (from the top), keep the faces and
their shoulders (`body`, 1.6 studs) inside the margins (clear of the app buttons), and keep faces out of the caption
band. `size` is how big a head is (0.1 = medium shot, 0.16 = close); `wide: 1.3` backs off. It follows the subjects
as they move. Hand-placed cameras (move, pushIn) are for moves that need a path; check them with `npm run collide`.

## Put people on surfaces by raycast (blockrig/video `placeOn`)

`const ground = surfaces(world.root)` once, then `placeOn(rig, ground, x, z)` (feet) or
`placeOn(rig, ground, x, z, ON_SEAT, { below: 4 })` (hips on the seat under 4 studs): no hand-measured floor, seat
or bed heights, and soft things take the body in by their softness.

## Camera (src/direction/camera.ts + blockrig/video camera recipes)

Recipes: `move(from, to, p)` (dolly/crane), `pushIn(subject, dir, far, near, p)`, `orbit`, `follow`, `lowAngle`,
`topDown`; `shake` is seeded per frame. Targets come from joints (`rig.jointPosition("Neck")`), so framing follows
the staging. Vary the angle every cut; the hook shot is wide and moving; reactions are close and still.

## Show the sky

The reference shorts shoot characters from slightly below (camera near chest height or lower, looking level or up),
so the deep blue sky and clouds fill the frame behind them. A camera looking down at the street shows only grey
ground and a hazy horizon. Outdoor close-ups: low and level; wides: high only when the place itself is the subject.

## Framing mistakes we made (check every new shot for these)

- **Caption over the face**: captions sit at 62% height. Aim slightly *below* the head (chest) for medium shots, and keep the face in the upper half. Floating tags above heads make this worse. `npm run collide` reports it ("caption-over-face") for any watched face inside the caption band while a caption shows.
- **Camera inside something**: wide props (hair, headphones, statues, trees, fences, lamp posts) swallow over-the-shoulder cameras. Prefer profile or front three-quarter, and move the camera rather than the world.
- **Blocked hero**: crowds, fences, trees and poles between camera and hero. Go top-down, low, or to the other side.
- **Seated characters floating or standing on furniture**: use `ON_SEAT`, not feet contacts, and `restOn()` for soft seats.
- **Perched on a bed like a board**: `npm run collide` reports "stiff"; seat with `restOn(top, "bed")`.
- **App zones**: keep faces out of the right 14% (buttons) and bottom 16% (username/caption).

`npm run stills -- s03 s05` for changed shots, `DEBUG=1` to see the caption band and app zones, and the `Shot`
composition in Studio to scrub one shot with notes.

## Inside a Roblox room (learned on the nasa video)

A Toolbox bedroom is full of furniture: an `on(person)` camera placed by the person's facing ended up inside a
chair back, behind the desk, or looking at a pile of props on the desk corner in half the shots. What worked:
- Measure the room first: list map.json parts by model with their boxes, and take a top view of the real scene
  (nasa's `cam` input prop: `PROPS='{"cam":{"pos":[x,y,z],"target":[x,y,z],"fov":110}}' npm run stills -- s01`, camera below the ceiling).
- Mark the open floor as a Box3 and clamp every camera in the room to it; shoot dialogue from that side.
- Stage actors in that open floor too, and let them "cheat out" (turn ~75% toward the camera side, as on a stage),
  or every line is the back of a head.
- Leave out map parts that stand between those cameras and the hero (`buildRobloxMap(..., { skip })`), and check
  that your own props (a pile of juice boxes!) don't sit on that line.
- Check a full contact sheet after each pass: the fixes interact.
