---
name: camera
description: Stage the acting and frame the shots - performance.ts (who stands where, clips, faces) and camera.ts recipes (push-in, crane, orbit, follow, low angle, top-down, shake), with the framing mistakes to avoid. Use when adding or changing a shot, or when a still shows a bad frame.
---

# Acting and camera

## Acting (src/direction/performance.ts)

Per shot: `place(person, x, z, rotY)` then `act(person, layers, local, face, ground, contacts)`. Rigs face +Z;
`facing(from, to)` gives the rotation. Layers are BlockRig clips (`src/cast/clips.ts`) with `at` (start offset),
`fade`, `weight`, `speed`; `poseAt` seeks them so any frame is exact. Contacts: `FEET` (standing), `ON_SEAT` (sitting
on furniture: hips on the seat, legs hang). New action → add a clip, check it in PoseLab.
**Soft things give way** (src/kit/surfaces.ts): a body sinks into a bed, sofa or pillow and a little into grass,
never into a floor. Put a character on a surface with `restOn(top, "bed")`, not the raw top: hips sink ~0.35 studs
into a mattress, which is what makes them look seated rather than perched on a board.

## Camera (src/direction/camera.ts + src/kit/camera.ts)

Recipes: `move(from, to, p)` (dolly/crane), `pushIn(subject, dir, far, near, p)`, `orbit`, `follow`, `lowAngle`,
`topDown`; `shake` is seeded per frame. Targets come from joints (`rig.jointPosition("Neck")`), so framing follows
the staging. Vary the angle every cut; the hook shot is wide and moving; reactions are close and still.

## Framing mistakes we made (check every new shot for these)

- **Caption over the face**: captions sit at 62% height. Aim slightly *below* the head (chest) for medium shots, and keep the face in the upper half. Floating tags above heads make this worse.
- **Camera inside something**: wide props (hair, headphones, statues, trees, fences, lamp posts) swallow over-the-shoulder cameras. Prefer profile or front three-quarter, and move the camera rather than the world.
- **Blocked hero**: crowds, fences, trees and poles between camera and hero. Go top-down, low, or to the other side.
- **Seated characters floating or standing on furniture**: use `ON_SEAT`, not feet contacts, and `restOn()` for soft seats.
- **Perched on a bed like a board**: `npm run collide` reports "stiff"; seat with `restOn(top, "bed")`.
- **App zones**: keep faces out of the right 14% (buttons) and bottom 16% (username/caption).

`npm run stills -- s03 s05` for changed shots, `DEBUG=1` to see the caption band and app zones, and the `Shot`
composition in Studio to scrub one shot with notes.
