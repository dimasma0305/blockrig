// Frame-pure animation on top of BlockRig's Animator: the pose at time t is rebuilt from scratch each frame
// from a list of layers, so frames can render in any order (as Remotion does).
import * as THREE from "three";
import { Animator } from "blockrig";

export type Layer = { clip: any; at?: number; fade?: number; weight?: number; speed?: number };

const clipLength = (clip: any) => clip.length || (clip.keyframes.length ? Math.max(...clip.keyframes.map((k: any) => k.t)) : 0);
const animators = new WeakMap<object, Animator>();

/** Pose `rig` at local time `t` (seconds) from layers. Later layers at higher priority override earlier ones. */
export function poseAt(rig: any, layers: Layer[], t: number) {
  let an = animators.get(rig);
  if (!an) { an = new Animator(rig); animators.set(rig, an); }
  an.tracks.length = 0;
  for (const L of layers) {
    const lt = (t - (L.at ?? 0)) * (L.speed ?? 1);
    if (lt < 0) continue;
    const w = (L.weight ?? 1) * Math.min(1, L.fade ? lt / L.fade : 1);
    if (w <= 0) continue;
    const tr: any = an.play(L.clip, { fade: 0, weight: w });
    const len = clipLength(L.clip);
    tr.time = len <= 0 ? 0 : L.clip.loop === false ? Math.min(lt, len - 1e-4) : lt % len;
  }
  an.update(0);
}

const v = new THREE.Vector3();
/**
 * Drop or raise the whole rig so its lowest contact sits on y = ground. `contacts` are joint names with the
 * distance from the joint down to the surface (e.g. a foot joint is 0.3 studs above the sole).
 */
export function groundRig(rig: any, ground: number, contacts: [string, number][]) {
  rig.object.updateMatrixWorld(true);
  const s = rig.object.scale.y;
  let lowest = Infinity;
  for (const [j, d] of contacts) { rig.jointPosition(j, v); lowest = Math.min(lowest, v.y - d * s); }
  rig.object.position.y += ground - lowest;
  rig.object.updateMatrixWorld(true);
}
export const FEET: [string, number][] = [["LeftFoot", 0.3], ["RightFoot", 0.3]];
export const KNEEL: [string, number][] = [["LeftFoot", 0.3], ["RightFoot", 0.3], ["RightLowerLeg", 0.5], ["LeftLowerLeg", 0.5]];
export const SEAT: [string, number][] = [["LowerTorso", 0.25], ["LeftFoot", 0.3], ["RightFoot", 0.3]];
