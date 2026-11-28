// Frame-pure animation with BlockRig's Animator: every frame seeks each layer's AnimationTrack to its own time
// (TimePosition), sets its weight with no fade, and steps the Animator by 0. Nothing carries over between frames,
// so Remotion can render them in any order. The tracks keep Roblox's priority and blending rules.
import * as THREE from "three";
import { Animator } from "../animator.js";

const state = new WeakMap();

/**
 * Pose `rig` at local time `t` (seconds) from layers `{ clip, at?, fade?, weight?, speed? }`. Higher-priority clips
 * override lower ones (AnimationPriority). A non-looped clip holds its last pose, just short of the end, where
 * Roblox would stop the track.
 */
export function poseAt(rig, layers, t) {
  let s = state.get(rig);
  if (!s) { s = { an: new Animator(rig), tracks: new Map() }; state.set(rig, s); }
  const used = new Set();
  for (const L of layers) {
    const lt = (t - (L.at ?? 0)) * (L.speed ?? 1);
    if (lt < 0) continue;
    const w = (L.weight ?? 1) * Math.min(1, L.fade ? lt / L.fade : 1);
    if (w <= 0) continue;
    let tr = s.tracks.get(L.clip);
    if (!tr) { tr = s.an.loadAnimation(L.clip); s.tracks.set(L.clip, tr); }
    if (!tr.isPlaying) tr.play(0, w, 0); else tr.adjustWeight(w, 0);
    tr.timePosition = tr.length <= 0 ? 0 : tr.looped ? lt % tr.length : Math.min(lt, tr.length - 1e-4);
    used.add(tr);
  }
  for (const tr of s.an.getPlayingAnimationTracks()) if (!used.has(tr)) tr.stop(0);
  s.an.update(0);
}

const v = new THREE.Vector3();
/**
 * Drop or raise the whole rig so its lowest contact sits on y = ground. `contacts` are joint names with the distance
 * from the joint down to the surface (a foot joint is 0.3 studs above the sole). Records where the character rests
 * in `rig.object.userData.contact`, which the staging check (createProbe) reads.
 */
export function groundRig(rig, ground, contacts) {
  rig.object.updateMatrixWorld(true);
  const s = rig.object.scale.y;
  let lowest = Infinity;
  for (const [j, d] of contacts) { rig.jointPosition(j, v); lowest = Math.min(lowest, v.y - d * s); }
  rig.object.position.y += ground - lowest;
  rig.object.updateMatrixWorld(true);
  let cx = 0, cz = 0; for (const [j] of contacts) { rig.jointPosition(j, v); cx += v.x / contacts.length; cz += v.z / contacts.length; }
  rig.object.userData.contact = { ground, x: cx, z: cz };
}
export const FEET = [["LeftFoot", 0.3], ["RightFoot", 0.3]];
export const KNEEL = [["LeftFoot", 0.3], ["RightFoot", 0.3], ["RightLowerLeg", 0.5], ["LeftLowerLeg", 0.5]];
export const SEAT = [["LowerTorso", 0.25], ["LeftFoot", 0.3], ["RightFoot", 0.3]];
/** Sitting on furniture: only the hips rest on the surface; the legs hang. */
export const ON_SEAT = [["LowerTorso", 0.35]];
