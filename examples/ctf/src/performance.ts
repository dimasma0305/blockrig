// Per-shot staging: where everyone stands, what they play, their faces, IK, tags and the world's state.
// Everything is computed from the shot and the time, so any frame can be rendered on its own.
import * as THREE from "three";
import type { Cast, Person } from "./characters";
import type { Shot } from "./timeline";
import type { WorldState } from "./World";
import { poseAt, groundRig, FEET, type Layer } from "./lib/pose";
import * as C from "./clips";
import { clamp01, easeInOut, easeOut, lerp } from "./lib/rng";
import { BAKERY, SCHOOL, HERO_STREET, PX, VAULT, TERMINAL, BARRIER_Z } from "./layout";
import { SHOTS } from "./timeline";

const PI = Math.PI;
const at = (id: string) => SHOTS.find((s) => s.id === id)!;
function place(p: Person, x: number, z: number, rotY: number) { p.rig.object.visible = true; p.rig.object.position.set(x, 0, z); p.rig.object.rotation.set(0, rotY, 0); }
function act(p: Person, layers: Layer[], t: number, expr?: string) {
  poseAt(p.rig, layers, t);
  if (expr) p.face.set(expr, { fade: 0 });
  groundRig(p.rig, 0, FEET);
}
const facing = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(to.x - from.x, to.z - from.z);
const tag = (p: Person, s: string, c: string) => p.tag.userData.set(s, c);

export function emptyState(): WorldState {
  return { receipt: 0, sql: 0, schoolGlitch: 0, hits: [], alarm: 0, flicker: 0, shatter: 0, beams: [], drones: 0, dronesFall: 0, sparks: [], vaultOpen: 0, confetti: -1, heroRank: "last", screen: 0, screenReveal: 0, streetSource: 0 };
}

// the attack on the dome (shot s07 onwards): hit points on the dome surface, at fixed times
const domeTop = new THREE.Vector3(PX, 0, VAULT.z);
function domePoint(az: number, el: number) { return new THREE.Vector3(PX + Math.sin(az) * Math.cos(el) * VAULT.radius, Math.sin(el) * VAULT.radius, VAULT.z + Math.cos(az) * Math.cos(el) * VAULT.radius); }
const HITS = [0.15, 0.32, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9].map((t, i) => ({ t, p: domePoint(-0.7 + (i % 5) * 0.35, 0.35 + (i % 3) * 0.18) }));

export function perform(shot: Shot, local: number, p: number, time: number, cast: Cast): { state: WorldState; focus: THREE.Vector3 } {
  const s = emptyState(), { hero, baker, kids, pros, crowd, all } = cast;
  for (const q of all) { q.rig.object.visible = false; if (q.laptop) q.laptop.visible = !!q.laptop.userData.always; }
  for (const c of hero.rig.ikControls) c.enabled = false;
  tag(hero, "#8,000,000,000", "#ff4d5e");
  const id = shot.id, street = ["s01", "s02", "s03", "s04", "s14"].includes(id);
  let focus = new THREE.Vector3();

  if (street) {
    // townsfolk walking both ways along the pavements
    crowd.forEach((c, i) => {
      const dir = i % 2 ? 1 : -1, side = i % 4 < 2 ? 1 : -1, speed = 3.2 + (i % 3) * 0.4;
      const z = ((((time * speed * -dir + i * 9.3) % 84) + 84) % 84) - 60;
      place(c, side * (7.6 + (i % 3) * 1.1), z, dir > 0 ? 0 : PI);
      act(c, [{ clip: C.walk, at: -i * 0.37 }], time);
    });
    place(baker, BAKERY.x + 0.9, BAKERY.z, -PI / 2); act(baker, [{ clip: C.idle, at: -0.4 }], time, "happy");
    kids.forEach((k, i) => { place(k, SCHOOL.x + 2.2, SCHOOL.z - 1.4 + i * 2.8, PI / 2 + (i ? -0.3 : 0.3)); act(k, [{ clip: C.idle, at: -i }], time, "grin"); });
    place(hero, HERO_STREET.x, HERO_STREET.z, 0); act(hero, [{ clip: C.idle }], time, "neutral");
  }
  if (id === "s01") focus.set(0, 3, -10);
  if (id === "s02") {
    const cust = crowd[0]; place(cust, BAKERY.x - 2.4, BAKERY.z - 1.8, PI / 2 + 0.4); act(cust, [{ clip: C.idle }], time, "happy");
    act(baker, [{ clip: C.handOver, at: 0.05, fade: 0.2 }], local, "happy");
    s.receipt = easeOut(clamp01((local - 0.35) / 0.3)); focus.set(BAKERY.x, 3, BAKERY.z);
  }
  if (id === "s03") {
    kids.forEach((k, i) => act(k, [{ clip: C.cheer, at: -i * 0.17 }], local, "grin"));
    s.sql = easeOut(clamp01(local / 0.25)); s.schoolGlitch = 0.5 + 0.5 * Math.sin(local * 18); focus.set(SCHOOL.x + 2, 2.5, SCHOOL.z);
  }
  if (id === "s04") {
    act(hero, [{ clip: C.idle }, { clip: C.slump, at: 0.45, fade: 0.35 }], local, local < 0.45 ? "neutral" : "sad");
    if (local > 0.55 && Math.floor(local * 14) % 3 === 0) tag(hero, "#8,000,000,000", "#ffffff");
    focus.set(HERO_STREET.x, 3, HERO_STREET.z);
  }
  if (id === "s14") {
    // the whole street checks the page source on their laptops
    crowd.forEach((c, i) => { const row = Math.floor(i / 4), col = i % 4; place(c, -6 + col * 4 + (row % 2) * 1.5, -4 - row * 5, 0); if (c.laptop) c.laptop.visible = true; act(c, [{ clip: C.type, at: -i * 0.1 }], local, i % 3 ? "smug" : "grin"); });
    place(hero, 0, 6, 0); tag(hero, "#1", "#ffd60a"); act(hero, [{ clip: C.smug, fade: 0.2 }], local, "smug");
    place(baker, -7, 2, 0.3); act(baker, [{ clip: C.smug }], local, "smug");
    kids.forEach((k, i) => { place(k, 6 + i * 2, 2.5, -0.3); act(k, [{ clip: C.cheer, at: -i * 0.2 }], local, "grin"); });
    s.heroRank = "one"; s.streetSource = 1; focus.set(0, 3, 0);
  }

  if (!street) {
    // the plaza: the crowd behind the barrier, the pros in front, the hero among the crowd until s09
    crowd.forEach((c, i) => {
      const x = PX - 22 + (i % 6) * 8.2 + (i > 5 ? 3 : 0), z = BARRIER_Z + 2.2 + (i > 5 ? 3 : 0);
      place(c, x, z, PI + (x - PX) * -0.012);
      const react = id === "s12" || id === "s13";
      act(c, react ? [{ clip: id === "s12" ? C.gasp : C.cheer, at: -i * 0.07 }] : [{ clip: C.crowdIdle, at: -i * 0.6 }, { clip: C.lookUp, weight: 0.6 }], time, react ? (id === "s12" ? "shocked" : "laugh") : id === "s08" ? "sad" : "neutral");
    });
    pros.forEach((q, i) => {
      const x = PX - 7.5 + i * 5, stepIn = id === "s06" ? easeInOut(clamp01(local / 0.6)) : ["s07", "s08", "s09", "s10", "s11", "s12", "s13"].includes(id) ? 1 : 0;
      place(q, x, BARRIER_Z - 3 - stepIn * 3, PI + (x - PX) * 0.03);
      if (q.laptop) q.laptop.visible = true;
      const mood = id === "s08" || id === "s09" ? "sad" : id === "s12" || id === "s13" ? "shocked" : id === "s07" ? "furious" : "determined";
      const layers: Layer[] = id === "s05" ? [{ clip: C.idle, at: -i }] : id === "s08" || id === "s09" ? [{ clip: C.slump, fade: 0.3 }] : id === "s12" || id === "s13" ? [{ clip: C.gasp, at: -i * 0.05 }] : [{ clip: C.idle, at: -i }, { clip: C.aim, at: -i * 0.1, fade: 0.25 }];
      act(q, layers, id === "s06" ? local : time, mood);
    });
  }
  if (id === "s05") { place(hero, PX + 9, BARRIER_Z + 3, PI); act(hero, [{ clip: C.lookUp }], time, "neutral"); focus.set(PX, 10, VAULT.z); }
  if (id === "s06") { place(hero, PX + 9, BARRIER_Z + 3, PI); act(hero, [{ clip: C.idle }], time, "neutral"); focus.set(PX, 3, BARRIER_Z - 5); }
  if (id === "s07" || id === "s08") {
    const t7 = id === "s07" ? local : at("s07").dur + local, d7 = at("s07").dur;
    // laptops fire at the dome: one beam per pro, the rainbow table from the third, then the botnet
    pros.forEach((q, i) => {
      if (!q.laptop) return;
      q.rig.object.updateMatrixWorld(true);
      const from = q.laptop.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
      const target = HITS[(i * 2 + Math.floor(t7 / 0.4)) % HITS.length].p;
      const rainbow = i === 2 && t7 > d7 * 0.35;
      s.beams.push({ from, to: target, on: id === "s08" ? Math.max(0, 1 - local * 3) : clamp01((t7 - i * 0.08) / 0.25), rainbow, colour: rainbow ? "#ffffff" : "#ff2e88" });
    });
    s.hits = HITS.filter((h) => h.t <= t7);
    s.sparks = s.hits.slice(-6).map((h, i) => ({ at: s.hits.indexOf(h), age: t7 - h.t })).filter((e) => e.age < 0.8);
    s.drones = clamp01((t7 - d7 * 0.62) / 0.4); s.dronesFall = id === "s08" ? easeOut(clamp01(local / 0.8)) : 0;
    s.flicker = id === "s08" ? 1 : 0.5; s.alarm = id === "s07" ? 0.35 + 0.35 * Math.sin(t7 * 14) : Math.max(0, 0.5 - local);
    place(hero, PX + 9, BARRIER_Z + 3, PI); act(hero, [{ clip: C.lookUp }], time, "neutral");
    focus.set(PX, 8, VAULT.z + 8);
  }
  if (id === "s09") {
    // through the gap in the barrier, to the terminal at the vault door
    const a = { x: PX + 9, z: BARRIER_Z + 3 }, gap = { x: PX + 0.5, z: BARRIER_Z + 1 }, b = { x: TERMINAL.x, z: TERMINAL.z + 1.4 };
    const k = easeInOut(clamp01(local / shot.dur)), first = k < 0.4, kk = first ? k / 0.4 : (k - 0.4) / 0.6;
    const from = first ? a : gap, to = first ? gap : b;
    place(hero, lerp(from.x, to.x, kk), lerp(from.z, to.z, kk), facing(from, to)); act(hero, [{ clip: C.walk }], local, "determined");
    s.flicker = 0.4; focus.set(hero.rig.object.position.x, 2.5, hero.rig.object.position.z);
  }
  if (id === "s10" || id === "s11") {
    place(hero, TERMINAL.x, TERMINAL.z + 1.35, PI);
    const typing = id === "s10";
    act(hero, typing ? [{ clip: C.type }] : [{ clip: C.type, weight: 0.6 }, { clip: C.gasp, weight: 0.5, fade: 0.2 }], local, typing ? "smug" : "shocked");
    if (typing) {
      // IK: fingertips on the keyboard, tapping
      const kb = new THREE.Vector3(TERMINAL.x, 2.56, TERMINAL.z + 0.32), tap = (o: number) => 0.04 * Math.max(0, Math.sin(local * 22 + o));
      const [l, r] = hero.rig.ikControls;
      l.target = kb.clone().add(new THREE.Vector3(0.28, tap(0), 0)); r.target = kb.clone().add(new THREE.Vector3(-0.28, tap(1.7), 0));
      l.enabled = r.enabled = true; hero.rig.solveIK(); groundRig(hero.rig, 0, FEET);
    }
    s.screen = 1; s.screenReveal = id === "s11" ? clamp01(local / 0.5) : 0; s.flicker = 0.3;
    if (id === "s11") hero.rig.object.visible = false; // the camera is where the hero's head would be
    focus.set(TERMINAL.x, 2.8, TERMINAL.z);
  }
  if (id === "s12" || id === "s13") {
    const t12 = id === "s12" ? local : at("s12").dur + local;
    s.shatter = clamp01(t12 / 1.1); s.vaultOpen = easeInOut(clamp01((t12 - 0.3) / 0.9)); s.confetti = t12 - 0.35;
    s.screen = 1; s.screenReveal = 1;
    place(hero, TERMINAL.x - 1.5, TERMINAL.z + 2.2, PI * 0.15);
    if (id === "s12") act(hero, [{ clip: C.cheer }], local, "laugh");
    else { tag(hero, "#1", "#ffd60a"); s.heroRank = "one"; act(hero, [{ clip: C.celebrate }], local, "grin"); }
    focus.set(PX, 5, VAULT.z + 10);
  }
  for (const q of all) if (q.rig.object.visible) q.rig.updateFace(0);
  void domeTop;
  return { state: s, focus };
}
