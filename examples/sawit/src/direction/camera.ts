// One camera recipe per shot (docs/story.md "camera"). Targets follow the cast's joints, so a change in staging
// keeps the framing. Check each changed shot: npm run stills -- s03
import * as THREE from "three";
import { V, move, pushIn, follow, type Cam, type Shot } from "../kit";
import type { Cast } from "../cast/characters";
import { LOCATIONS, type World } from "../world/World";

const head = (rig: any) => rig.jointPosition("Neck", new THREE.Vector3()).add(V(0, 0.7, 0));
const chest = (rig: any) => rig.jointPosition("Neck", new THREE.Vector3()).add(V(0, -0.6, 0));
const pos = (q: { rig: any }) => q.rig.object.position.clone();
const fwd = (q: { rig: any }, d = 1) => { const a = q.rig.object.rotation.y; return V(Math.sin(a) * d, 0, Math.cos(a) * d); };

export function cameraFor(shot: Shot, p: number, local: number, cast: Cast, world: World): Cam {
  const cam = shotCamera(shot, p, local, cast, world);
  if (shot.location === "room") { // stay inside the room (and its corridor)
    const R = LOCATIONS.room, b = new THREE.Box3(V(R.x - world.RW / 2 + 1, 0.8, R.z - world.RD / 2 + 1), V(R.x + world.RW / 2 - 1, 17, R.z + world.RD / 2 + 38));
    if (cam.pos.z > R.z + world.RD / 2) { b.min.x = R.x - 9; b.max.x = R.x + 9; }
    b.clampPoint(cam.pos, cam.pos);
  }
  return cam;
}

function shotCamera(shot: Shot, p: number, local: number, cast: Cast, world: World): Cam {
  const { hero, grandpa, king, guards, villagers, kids } = cast, VIL = LOCATIONS.village, FOR = LOCATIONS.forest, ROOM = LOCATIONS.room;
  switch (shot.id) {
    case "s01": { const h = pos(hero); return move([V(VIL.x + 60, 95, VIL.z - 300), V(VIL.x, 0, VIL.z - 120)], [V(h.x + 8, 7, h.z - 16), head(hero.rig).add(V(0, -0.6, 0))], p, 50); }
    case "s02": { const s = world.swing.position, out = V(Math.sin(world.school.yaw), 0, Math.cos(world.school.yaw)); return move([s.clone().addScaledVector(out, 90).add(V(0, 45, 0)), s.clone().add(V(0, 12, 0))], [s.clone().addScaledVector(out, 17).add(V(0, 5, 0)), s.clone().add(V(0, 4.5, 0))], p, 48); }
    case "s03": { const c = world.VIC; return move([c.clone().add(V(-40, 45, -190)), c.clone().add(V(0, 10, 0))], [c.clone().add(V(-20, 34, -130)), c.clone().add(V(0, 14, 0))], p, 50); }
    case "s04": { const c = world.VIC; return move([c.clone().add(V(-20, 30, -135)), c.clone().add(V(0, 8, 0))], [c.clone().add(V(-30, 18, -150)), c.clone().add(V(-5, 6, -60))], p, 52); }
    case "s05": { const s = world.statue.object.position; return move([s.clone().add(V(-10, 1.5, 38)), s.clone().add(V(0, 8, 0))], [s.clone().add(V(-6, 1.2, 32)), s.clone().add(V(0, 9, 0))], p, 50); }
    case "s06": { const k = head(king.rig); return move([world.gate.clone().add(V(-14, 9, -70)), k.clone().add(V(0, -6, 0))], [world.gate.clone().add(V(-8, 8, -52)), k.clone().add(V(0, -3, 0))], p, 48); }
    case "s07": { const k = chest(king.rig); return move([k.clone().add(V(-6, 2.5, -16)), k.clone().add(V(-2.5, -0.5, 0))], [k.clone().add(V(-4, 2, -12)), k.clone().add(V(-2.5, -0.3, 0))], p, 46); }
    case "s08": { const m = pos(hero).lerp(pos(grandpa), 0.5); return { pos: m.clone().add(V(4, 4.5, -13)), target: m.add(V(1, 3.2, 0)), fov: 50, shake: 0 }; }
    case "s09": { const g = pos(grandpa); return move([g.clone().add(V(9, 5, 7)), g.clone().add(V(-40, 5, -6))], [g.clone().add(V(11, 4.5, 6)), g.clone().add(V(-40, 4, -8))], p, 50); }
    case "s10": { const g = head(grandpa.rig); return pushIn(g.clone().add(V(0, -0.6, 0)), V(-1, 0.25, 0.55), 10, 7, p, 40, 0.2); }
    case "s11": { const h = head(hero.rig), d = fwd(hero); return { pos: h.clone().addScaledVector(d, -4.5).add(V(1.2, 1, 0)), target: h.clone().addScaledVector(d, 60).add(V(0, 14, 0)), fov: 52, shake: 0 }; }
    case "s12": { const h = pos(hero), d = fwd(hero); return { pos: h.clone().addScaledVector(d, -7).add(V(0, 1.6, 0)), target: h.clone().addScaledVector(d, 6).add(V(0, 2.5, 0)), fov: 58, shake: 0.08 }; }
    case "s13": { const h = head(hero.rig); return pushIn(h.clone().add(V(0, -0.3, 0)), V(-0.85, 0.05, 0.5), 8, 5.5, p, 42, 0.2); }
    case "s14": { const g = pos(guards[1]); return { pos: world.firstTree.position.clone().add(V(-1, 1.2, 2)), target: g.add(V(0, 4, 0)), fov: 55, shake: 0 }; }
    case "s15": {
      if (p < 0.55) { const t = world.firstTree.position; return move([t.clone().add(V(-12, 5, 10)), t.clone().add(V(-2, 5, 0))], [t.clone().add(V(-10, 6, 9)), t.clone().add(V(-2, 8, 0))], p / 0.55, 50); }
      const h = head(hero.rig); return { pos: h.clone().add(V(-4.5, 0.3, 2.6)), target: h.add(V(0, -0.2, 0)), fov: 40, shake: 0 };
    }
    case "s16": { const h = pos(hero); return { pos: h.clone().add(V(4, 14, -16)), target: world.gate.clone().add(V(0, 14, 0)), fov: 52, shake: 0 }; }
    case "s17": { const c = ROOM.clone().add(V(0, 5, world.RD / 2 + 1)); return move([c.clone().add(V(-3, 0.5, 20)), c], [c.clone().add(V(-2, 0.2, 13)), c], p, 50); }
    case "s18": { const m = world.theMap.getWorldPosition(new THREE.Vector3()); return move([m.clone().add(V(-9, -1, 14)), m.clone().add(V(-6, 0, 0))], [m.clone().add(V(6, -1, 14)), m.clone().add(V(6, 0, 0))], p, 50); }
    case "s19": { const f = world.theMap.localToWorld(world.theMap.forest(13)); return pushIn(f, V(0, 0, 1), 12, 5, p, 40, 0); }
    case "s20": { const h = pos(hero); return { pos: h.clone().add(V(4, 1.2, 6)), target: ROOM.clone().add(world.HEAP).add(V(0, 4, 0)), fov: 58, shake: 0 }; }
    case "s21": { const R = ROOM; return move([R.clone().add(V(world.RW / 2 - 15, 6, -12)), R.clone().add(V(world.RW / 2 - 3, 2.5, -8))], [R.clone().add(V(world.RW / 2 - 15, 5, 6)), R.clone().add(V(world.RW / 2 - 3, 2.5, 10))], p, 50); }
    case "s22": {
      const b = world.book.getWorldPosition(new THREE.Vector3());
      if (p < 0.6) return pushIn(b, V(-1, 0, 0), 15, 11, p / 0.6, 45, 0);
      const h = head(hero.rig); return { pos: h.clone().add(V(-5, 0.4, 2)), target: h, fov: 42, shake: 0 };
    }
    case "s23": { const h = head(hero.rig); return { pos: h.clone().add(V(-1.6, 0.8, -6)), target: ROOM.clone().add(V(0, 5, world.RD / 2)), fov: 54, shake: 0 }; }
    case "s24": { const k = head(king.rig); return { pos: k.clone().add(V(0.4, -2.6, -6)), target: k.clone().add(V(0, -0.2, 0)), fov: 46, shake: 0 }; }
    case "s25": { const k = head(king.rig), h = head(hero.rig); return { pos: k.clone().add(V(2, 0.8, 4.5)), target: h.add(V(0, -0.4, 0)), fov: 46, shake: 0 }; }
    case "s26": { const top = world.windowLedge; return { pos: top.clone().add(V(14, -top.y + 3, -24)), target: top.clone().add(V(-2, 2, 4)).lerp(pos(hero).add(V(0, 2, 0)), 0.5), fov: 56, shake: 0.05 }; }
    case "s27": { const c = VIL.clone().add(V(0, 0, 18)); return move([c.clone().add(V(-40, 45, -40)), c], [c.clone().add(V(-24, 26, -26)), c], p, 48); }
    case "s28": { const a = pos(kids[0]); return move([V(FOR.x - 18, 5, FOR.z - 26), V(FOR.x + 6, 4, FOR.z - 12)], [V(FOR.x - 18, 5, FOR.z + 14), V(FOR.x + 6, 4, FOR.z + 18)], p, 52); }
    case "s29": return move([V(FOR.x - 30, 6, FOR.z - 4), V(FOR.x + 4, 4, FOR.z)], [V(FOR.x - 44, 22, FOR.z - 8), V(FOR.x + 8, 8, FOR.z)], p, 52);
    case "s30": { const k = pos(king); return { pos: k.clone().add(V(-16, 7, -6)), target: FOR.clone().add(V(10, 10, 0)), fov: 54, shake: 0 }; }
    case "s31": return move([FOR.clone().add(V(-36, 3, -2)), FOR.clone().add(V(10, 16, 0))], [FOR.clone().add(V(-40, 2.5, -2.5)), FOR.clone().add(V(10, 20, 0))], p, 58);
    case "s32": { const k = head(king.rig), d = fwd(king); return pushIn(k.clone().add(V(0, -0.3, 0)), d.clone().add(V(0, 0.08, 0)), 8, 5.5, p, 42, 0.2); }
    case "s33": { // over the crowd onto the map, then close on it
      const m = hero.props.map!.getWorldPosition(new THREE.Vector3());
      return move([m.clone().add(V(-12, 1.5, -3)), m], [m.clone().add(V(-4.2, 0.3, -0.6)), m], p, 46);
    }
    case "s33b": { const h = head(hero.rig), g = head(guards[0].rig), m = h.clone().lerp(g, 0.5); return { pos: m.clone().add(V(0.5, 1.4, 10.5)), target: m.clone().add(V(0, 1.6, 0)), fov: 50, shake: 0 }; } // from the side: the raised badge and the guard it belongs to
    case "s33c": { const g = head(guards[0].rig), k = head(king.rig); return { pos: g.clone().add(V(-5, 0.8, 4)), target: g.clone().lerp(k, 0.6), fov: 52, shake: 0 }; }
    case "s34": { const k = head(king.rig), d = fwd(king); return { pos: k.clone().addScaledVector(d, 7).add(V(0, 0.2, 0)), target: k.clone().add(V(0, -0.3, 0)), fov: 42, shake: 0 }; }
    case "s35": { const c = pos(villagers[5]); return move([c.clone().add(V(-12, 12, 18)), c.clone().add(V(6, 2, -4))], [c.clone().add(V(-10, 10, 14)), c.clone().add(V(6, 2, -4))], p, 50); }
    case "s36": { const f = world.FIELD.clone(); return move([f.clone().add(V(-30, 14, 70)), f.clone().add(V(0, 2, 10))], [f.clone().add(V(-20, 38, 75)), f.clone().add(V(0, 0, 0))], p, 52); }
    case "s37": { const k = pos(king); return move([k.clone().add(V(0, 90, -70)), k], [k.clone().add(V(0, 60, -40)), k], p, 45); }
    case "s38": { const g = pos(guards[1]).add(V(0, 4, 0)); return move([V(FOR.x - 16, 5, FOR.z + 14), g], [V(FOR.x - 4, 4.5, FOR.z + 18), g], p, 46); }
  }
  return follow(pos(hero), V(0, 6, 14));
}
