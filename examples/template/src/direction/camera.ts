// One camera recipe per shot (docs/story.md "camera" notes), built from the kit's recipes. Targets follow the
// cast's joints, so a change in staging keeps the framing. Check each changed shot: npm run stills -- s03
import * as THREE from "three";
import { V, move, pushIn, follow, lowAngle, type Cam, type Shot } from "../kit";
import type { Cast } from "../cast/characters";
import { LOCATIONS, type World } from "../world/World";

const head = (rig: any) => rig.jointPosition("Neck", new THREE.Vector3()).add(V(0, 0.6, 0));
const chest = (rig: any) => rig.jointPosition("Neck", new THREE.Vector3()).add(V(0, -0.8, 0));

export function cameraFor(shot: Shot, p: number, local: number, cast: Cast, world: World): Cam {
  const { hero, sister } = cast, B = LOCATIONS.bedroom, lawn = world.lawn;
  switch (shot.id) {
    case "s01": { // high wide crane down onto the street, ending behind the hero
      const h = hero.rig.object.position;
      return move([V(h.x - 10, 38, h.z - 30), V(h.x, 2, h.z + 30)], [V(h.x - 3, 6, h.z - 11), V(h.x + 1, 4, h.z + 8)], p, 52);
    }
    case "s02": return move([V(B.x - 4.2, 7.4, B.z + 14), V(B.x - 3.2, 2.6, B.z - 4)], [V(B.x - 4.0, 6.6, B.z + 11.5), V(B.x - 3.2, 2.8, B.z - 4)], p, 56); // both kids and the bed
    case "s03": { const r = hero.rig.object.rotation.y - 0.8; return pushIn(head(hero.rig).add(V(0, -1.1, 0)), V(Math.sin(r), 0.08, Math.cos(r)), 10, 7.5, p, 40, 0.3); } // from the front, away from the sister
    case "s04": return { pos: lawn.clone().add(V(-9, 1.3, -3.2)), target: world.heroHouse.door.clone().add(V(0, 6, 1)), fov: 58, shake: local > 0.22 && local < 0.6 ? 0.25 : 0.05 }; // low, in front of the hero, up at the house
    case "s05": return move([V(lawn.x - 22, 5.5, lawn.z - 16), chest(hero.rig)], [V(lawn.x - 19, 5, lawn.z - 13), chest(hero.rig)], p, 46);
    case "s06": { const t = chest(hero.rig).add(V(0, 0.4, 0)); return move([t.clone().add(V(-6, -0.6, 2.4)), t], [t.clone().add(V(-10, 0.6, 4.5)), t], p, 44); }
    case "s07": { const t = sister.rig.object.position.clone().add(V(0.5, 5.2, 1.4)); return { pos: lawn.clone().add(V(-13.5, 4.6, 5)), target: t, fov: 56, shake: 0 }; } // both kids and her rain cloud
  }
  return follow(hero.rig.object.position, V(0, 6, 14));
}
