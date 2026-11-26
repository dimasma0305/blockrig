// Frame-pure animation with BlockRig's Animator: every frame seeks each layer's AnimationTrack to its own time
// (timePosition), sets its weight with no fade, and steps the Animator by 0. Nothing carries over between
// frames, so Remotion can render them in any order.
import * as THREE from "three";
import { Animator, type AnimationTrack } from "blockrig";

export type Layer = { clip: any; at?: number; fade?: number; weight?: number; speed?: number };

const state = new WeakMap<object, { an: Animator; tracks: Map<any, AnimationTrack> }>();

/** Pose `rig` at local time `t` (seconds) from layers. Higher-priority clips override lower ones. */
export function poseAt(rig: any, layers: Layer[], t: number) {
  let s = state.get(rig);
  if (!s) { s = { an: new Animator(rig), tracks: new Map() }; state.set(rig, s); }
  const used = new Set<AnimationTrack>();
  for (const L of layers) {
    const lt = (t - (L.at ?? 0)) * (L.speed ?? 1);
    if (lt < 0) continue;
    const w = (L.weight ?? 1) * Math.min(1, L.fade ? lt / L.fade : 1);
    if (w <= 0) continue;
    let tr = s.tracks.get(L.clip);
    if (!tr) { tr = s.an.loadAnimation(L.clip); s.tracks.set(L.clip, tr); }
    if (!tr.isPlaying) tr.play(0, w, 0); else tr.adjustWeight(w, 0);
    // a non-looped clip holds its last pose (just short of the end, where Roblox would stop the track)
    tr.timePosition = tr.length <= 0 ? 0 : tr.looped ? lt % tr.length : Math.min(lt, tr.length - 1e-4);
    used.add(tr);
  }
  for (const tr of s.an.getPlayingAnimationTracks()) if (!used.has(tr)) tr.stop(0);
  s.an.update(0);
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
