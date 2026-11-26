// What every character does in every shot: place, facing, clips, expression and props. Pure function of time.
import * as C from "./clips";
import { STATUE_FACES } from "./characters";
import type { Cast } from "./characters";
import { poseAt, groundRig, FEET, KNEEL, SEAT, type Layer } from "./lib/pose";
import { byId, type Shot } from "./timeline";
import { PLINTH, STREET_X, SCHOOL_Z, KID_TOUCH_Z, KID_SIT_Z } from "./layout";
import { easeInOut, lerp, smooth, rng } from "./lib/rng";

const PI = Math.PI;
function face(f: any, name: string) { f.set(STATUE_FACES[name] ?? name, { fade: 0 }); }
function place(rig: any, x: number, y: number, z: number, rotY: number) { rig.object.visible = true; rig.object.position.set(x, y, z); rig.object.rotation.y = rotY; }
function act(rig: any, layers: Layer[], t: number) { poseAt(rig, [{ clip: C.idle }, ...layers], t); }

// townsfolk strolling round the park on a circle path, continuous across shots (uses global time)
function stroll(rig: any, i: number, time: number, r = 14.5) {
  const dir = i % 2 ? 1 : -1, speed = 3.1, a0 = (i / 6) * PI * 2 + 0.4;
  const a = a0 + (dir * speed * time) / r;
  place(rig, Math.sin(a) * r, 0, Math.cos(a) * r, a + (dir > 0 ? PI / 2 : -PI / 2));
  act(rig, [{ clip: C.walk, speed: 1.1, at: -i * 0.37 }], time);
}

export function perform(shot: Shot, local: number, p: number, time: number, cast: Cast) {
  const { kid, statue, folks, faces, props } = cast;
  for (const r of [kid, statue, ...folks]) r.object.visible = false;
  props.kidScarf.visible = false; props.bundle.visible = false;
  const scarfOn = shot.idx > byId("s12").idx || (shot.id === "s12" && p > 0.62);
  props.kidScarf.visible = scarfOn;

  const parkStatue = (layers: Layer[], expr: string, ground: [string, number][] = FEET) => {
    place(statue, 0, PLINTH.height, 0, 0); act(statue, layers, local); face(faces.statue, expr);
    groundRig(statue, PLINTH.height, ground);
  };
  const kidAt = (z: number, layers: Layer[], expr: string, rotY = PI, ground: [string, number][] | null = FEET, x = 0) => {
    place(kid, x, 0, z, rotY); act(kid, layers, local); face(faces.kid, expr);
    if (ground) groundRig(kid, 0, ground);
  };

  switch (shot.id) {
    case "s01": case "s02": case "s03": {
      parkStatue([{ clip: C.crouch }], "frozen");
      folks.forEach((f, i) => { if (i < 5) { stroll(f, i, time); face(faces[`folk${i}`], i % 2 ? "happy" : "neutral"); } });
      if (shot.id === "s03") { // one walker stops, points at the statue and shakes their head
        const f = folks[0]; place(f, -6.5, 0, 9.5, PI * 0.82); act(f, [{ clip: C.point, fade: 0.3 }], local); f.nudgeJoint("Neck", 0, Math.sin(local * 9) * 0.25, 0); face(faces.folk0, "determined");
      }
      break;
    }
    case "s04": {
      parkStatue([{ clip: C.crouch }], "frozen");
      kidAt(lerp(21, KID_TOUCH_Z + 1.2, easeInOut(p * 0.95)), [{ clip: C.walk }, { clip: C.lookAround }], "happy", PI, null);
      folks.forEach((f, i) => { if (i < 3) stroll(f, i + 2, time, 19); });
      break;
    }
    case "s05": {
      parkStatue([{ clip: C.crouch }], "frozen");
      kidAt(KID_TOUCH_Z, [{ clip: C.touch, fade: 0.15 }], "smug");
      break;
    }
    case "s06": {
      parkStatue([{ clip: C.crouch }], "frozen");
      kidAt(KID_TOUCH_Z + 0.3, [{ clip: C.lookUp, fade: 0.25 }], "shocked");
      break;
    }
    case "s07": {
      parkStatue([{ clip: C.crouch }], local > 0.18 ? "awake" : "frozen");
      kidAt(KID_TOUCH_Z + 0.3, [{ clip: C.lookUp }], "shocked");
      break;
    }
    case "s08": {
      parkStatue([{ clip: C.standUp, at: 0.05 }], "awake");
      kidAt(KID_TOUCH_Z + 0.6 + p * 0.8, [{ clip: C.scaredBack, fade: 0.2 }], "scared");
      break;
    }
    case "s09": {
      parkStatue([{ clip: C.statueIdle }], "awake");
      // folks scatter outwards
      folks.forEach((f, i) => {
        const a = (i / folks.length) * PI * 2 + 0.3, r = 12 + local * 9;
        place(f, Math.sin(a) * r, 0, Math.cos(a) * r, a); act(f, [{ clip: C.run }], time); face(faces[`folk${i}`], "scared");
      });
      // the kid backs away, trips and lands sitting
      const tripAt = 0.45 * shot.dur;
      if (local < tripAt) kidAt(lerp(KID_TOUCH_Z + 1.4, KID_SIT_Z - 0.6, local / tripAt), [{ clip: C.walk, speed: 1.6 }, { clip: C.scaredBack }], "scared");
      else kidAt(KID_SIT_Z, [{ clip: C.trip, at: tripAt }], "scared", PI, SEAT);
      break;
    }
    case "s10": {
      parkStatue([{ clip: C.statueIdle }, { clip: C.kneelReach, at: shot.dur * 0.55, weight: 0.25 }], "awake");
      kidAt(KID_SIT_Z, [{ clip: C.sit }], "scared", PI, SEAT);
      break;
    }
    case "s11": {
      parkStatue([{ clip: C.kneelReach }], "awake", KNEEL);
      kidAt(KID_SIT_Z, [{ clip: C.sit }], "scared", PI, SEAT);
      break;
    }
    case "s12": {
      parkStatue([{ clip: C.kneelHold }], "gentle", KNEEL);
      props.bundle.visible = p < 0.45;
      if (p < 0.4) kidAt(KID_SIT_Z, [{ clip: C.sit }], "shocked", PI, SEAT);
      else kidAt(KID_SIT_Z - 0.4, [{ clip: C.wrapScarf, at: 0.4 * shot.dur }], "happy");
      break;
    }
    case "s13": {
      const z = lerp(22, 4, easeInOut(p));
      place(kid, STREET_X + 9, 0, z, PI); act(kid, [{ clip: C.walk }], local); face(faces.kid, "happy");
      kid.nudgeJoint("Neck", 0.35, -0.5, 0); // looks up at the statue beside them
      place(statue, STREET_X + 1.5, 0, z - 1.5, PI); act(statue, [{ clip: C.walk, speed: 0.55 }], local); face(faces.statue, "gentle");
      [3, 4].forEach((i, k) => { place(folks[i], STREET_X - 13 - k * 3, 0, 6 - k * 5, PI / 2); act(folks[i], [{ clip: C.scaredBack }], local); face(faces[`folk${i}`], "shocked"); });
      break;
    }
    case "s14": {
      place(kid, STREET_X + 2, 0, SCHOOL_Z + 20, 0); act(kid, [{ clip: C.smug, fade: 0.2 }], local); face(faces.kid, "smug");
      place(statue, STREET_X + 2, 0, SCHOOL_Z + 12, 0); act(statue, [{ clip: C.armsFolded }], local); face(faces.statue, "gentle"); groundRig(statue, 0, FEET);
      const r = rng(7);
      [0, 1, 2, 5].forEach((i, k) => {
        const side = k % 2 ? 1 : -1;
        place(folks[i], STREET_X + side * (11 + r() * 3), 0, SCHOOL_Z + 26 + k * 2, -side * PI / 2);
        act(folks[i], [{ clip: C.scaredBack, weight: 0.6 }], local); face(faces[`folk${i}`], k % 2 ? "shocked" : "scared");
      });
      break;
    }
  }
  return { snowFall: snowAt(time), cover: coverAt(time), street: shot.location === "street" };
}

// how hard it is snowing, and how white the ground is, over the whole film
export function snowAt(t: number) {
  const s6 = byId("s06"), s13 = byId("s13");
  if (t < s6.start) return 0;
  if (t < s13.start) return smooth((t - s6.start) / (s6.dur * 0.8));
  return 0.45;
}
export function coverAt(t: number) {
  const s6 = byId("s06"), s11 = byId("s11"), s13 = byId("s13");
  if (t < s6.start) return 0;
  if (t < s13.start) return 0.75 * smooth((t - s6.start) / (s11.start - s6.start));
  return 0.6;
}
