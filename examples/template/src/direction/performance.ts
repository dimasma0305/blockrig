// What every character does in every shot: where they stand, which clips play, their face. Pure function of
// (shot, local time): call it every frame. Unused characters are hidden. Follow docs/story.md "action" notes.
import * as THREE from "three";
import { poseAt, groundRig, FEET, ON_SEAT, type Layer } from "../kit/pose";
import { facsExpression } from "blockrig";
import type { Shot } from "../kit";
import * as C from "../cast/clips";
import type { Cast, Person } from "../cast/characters";
import { LOCATIONS, type World } from "../world/World";

const PI = Math.PI;
export function place(p: Person, x: number, z: number, rotY: number, y = 0) { p.rig.object.visible = true; p.rig.object.position.set(x, y, z); p.rig.object.rotation.set(0, rotY, 0); }
/** Pose a person from clip layers at local time t, set the face, and stand them on the ground (or seat them). */
export function act(p: Person, layers: Layer[], t: number, face: string | undefined, ground = 0, contacts = FEET) {
  poseAt(p.rig, layers, t);
  if (p.faceSets) { // Roblox face accessories: show the set for this emotion
    const show = new Set(p.faceSets[face ?? "neutral"] ?? p.faceSets.neutral ?? []);
    for (const set of Object.values(p.faceSets)) for (const o of set) o.visible = show.has(o);
  } else if (p.dynamic) { Object.assign(p.rig.faceControls, facsExpression(face ?? "neutral")); p.rig.applyFaceControls(); } // Roblox dynamic head
  else { if (face) p.face.set(face, { fade: 0 }); p.rig.updateFace(0); } // drawn face: redraw the live texture
  groundRig(p.rig, ground, contacts);
}
const faceOf = (shot: Shot, who: string, fallback = "neutral") => shot.faces?.[who] ?? fallback;
/** Face a point on the ground: the rotation to give rig.object.rotation.y (rigs face +Z). */
export const facing = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

export type Perform = { cloudAt: THREE.Vector3 | null };

export function perform(shot: Shot, local: number, p: number, cast: Cast, world: World): Perform {
  const { hero, sister, neighbours } = cast;
  for (const q of cast.all) q.rig.object.visible = false;
  world.dog.visible = false;
  const out: Perform = { cloudAt: null };
  const lawn = world.lawn, sidewalkX = world.roadHalf + 3;
  const neighbourSpots = [new THREE.Vector3(sidewalkX + 1, 0, lawn.z - 12), new THREE.Vector3(sidewalkX + 2.5, 0, lawn.z - 9), new THREE.Vector3(-sidewalkX, 0, lawn.z - 6), new THREE.Vector3(-sidewalkX - 2, 0, lawn.z - 2)];

  switch (shot.id) {
    case "s01": { // hero walks down the sunny sidewalk with the dog; neighbours chat
      const z = lawn.z - 40 + local * 6.5;
      place(hero, sidewalkX, z, 0); act(hero, [{ clip: C.walk }], local, faceOf(shot, "hero"), world.sidewalkY);
      world.dog.visible = true; world.dog.position.set(sidewalkX + 2.2, world.sidewalkY, z + 1.5); world.dog.rotation.y = 0; world.lib.pose(world.dog, "Walk", local);
      neighbours.forEach((n, i) => { const s = neighbourSpots[i]; place(n, s.x, s.z + 14, i % 2 ? -PI / 2 : PI / 2); act(n, [{ clip: C.crowdIdle, at: -i * 0.7 }], local, "happy", world.sidewalkY); });
      break;
    }
    case "s02": case "s03": { // bedroom: sister accuses, hero on the bed
      const seat = world.bedSpot.seat;
      // the hero sits on the side of the bed, turned a little toward the camera; the sister faces him
      place(hero, seat.x, seat.z, PI / 2 - 0.45); act(hero, [{ clip: C.sit }, ...(shot.id === "s03" ? [{ clip: C.shrug, fade: 0.15 }] : [])], local, faceOf(shot, "hero"), world.bedSpot.top, ON_SEAT);
      // the sister stands between the bed and the wide camera, so both kids share the frame in any room
      const toCam = world.bedView.from.clone().sub(seat).setY(0).normalize(), st = seat.clone().addScaledVector(toCam, 3.6).add(new THREE.Vector3(toCam.z, 0, -toCam.x).multiplyScalar(-1.3));
      place(sister, st.x, st.z, facing(st, seat));
      act(sister, [{ clip: C.armsCrossed }], local, faceOf(shot, "sister", "angry"));
      break;
    }
    case "s04": case "s05": case "s06": { // the storm over the street; the hero on his lawn
      place(hero, lawn.x, lawn.z, -PI / 2);
      const clip = shot.id === "s06" ? C.slump : shot.id === "s04" ? C.lookUp : C.gasp;
      act(hero, [{ clip }], local, faceOf(shot, "hero"), lawn.y);
      if (shot.id === "s05") neighbours.forEach((n, i) => {
        const s = neighbourSpots[i]; place(n, s.x, s.z, facing(s, lawn));
        act(n, [{ clip: C.point, at: -0.05 * i, fade: 0.2 }], local, "shocked", world.sidewalkY);
      });
      break;
    }
    case "s07": { // golden hour: the sister smiles under her own little rain cloud
      place(hero, lawn.x - 1.5, lawn.z + 2.5, -PI / 2 - 0.5); act(hero, [{ clip: C.smug }], local, faceOf(shot, "hero"), lawn.y);
      const at = new THREE.Vector3(lawn.x - 4, 0.3, lawn.z - 3.2);
      place(sister, at.x, at.z, -PI / 2 + 0.35); // facing the road and the camera
      act(sister, [{ clip: C.idle }], local, faceOf(shot, "sister", "happy"), lawn.y);
      out.cloudAt = new THREE.Vector3(at.x, 0.3, at.z);
      world.dog.visible = true; world.dog.position.set(lawn.x - 2, lawn.y, lawn.z + 6); world.dog.rotation.y = -PI / 2 - 0.6; world.lib.pose(world.dog, "Idle", local);
      break;
    }
  }
  return out;
}
