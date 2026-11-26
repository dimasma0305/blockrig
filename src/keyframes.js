// Import Roblox animations: KeyframeSequence (from a binary .rbxm) -> BlockRig clip.
//
// Roblox structure (create.roblox.com/docs/reference/engine/classes/KeyframeSequence):
//   KeyframeSequence { Loop, Priority }
//     Keyframe { Time, Name }            -- a Name other than "Keyframe" fires KeyframeReached
//       KeyframeMarker { Name, Value }   -- fires GetMarkerReachedSignal(Name)
//       Pose "HumanoidRootPart"          -- tree root; it has no Motor6D of its own
//         Pose "LowerTorso" { CFrame, EasingStyle, EasingDirection, Weight }  -- drives the Root motor
//           Pose "UpperTorso" ...        -- each Pose drives the Motor6D whose Part1 has its name
// Pose.CFrame is written to Motor6D.Transform (Part1 = Part0 * C0 * Transform * C1^-1), i.e. it is expressed
// in the joint frame given by C0. The standard R15 rig attachments are axis-aligned, so that frame matches the
// character axes BlockRig uses. R6 joints have rotated C0s, which are converted below.
import * as THREE from "three";
import { findInstance } from "./rbxm.js";

/** Enum.PoseEasingStyle values -> BlockRig easing names. */
export const POSE_EASING_STYLE = { 0: "Linear", 1: "Constant", 2: "Elastic", 3: "Cubic", 4: "Bounce", 5: "CubicV2" };
/** Enum.PoseEasingDirection values. */
export const POSE_EASING_DIRECTION = { 0: "In", 1: "Out", 2: "InOut" };
/** Enum.AnimationPriority values. */
export const ANIMATION_PRIORITY = { 0: "Idle", 1: "Movement", 2: "Action", 3: "Action2", 4: "Action3", 5: "Action4", 1000: "Core" };

/**
 * Rotations of the classic R6 rig's Motor6D C0s (Torso-relative), keyed by the Pose / Part1 name.
 * These are the standard R6 values (community-documented). A Transform R in that frame equals the
 * character-axes rotation C0 · R · C0⁻¹.
 */
export const R6_C0_ROTATIONS = {
  Torso: [-1, 0, 0, 0, 0, 1, 0, 1, 0], // RootJoint
  Head: [-1, 0, 0, 0, 0, 1, 0, 1, 0], // Neck
  "Right Arm": [0, 0, 1, 0, 1, 0, -1, 0, 0], // Right Shoulder
  "Left Arm": [0, 0, -1, 0, 1, 0, 1, 0, 0], // Left Shoulder
  "Right Leg": [0, 0, 1, 0, 1, 0, -1, 0, 0], // Right Hip
  "Left Leg": [0, 0, -1, 0, 1, 0, 1, 0, 0], // Left Hip
};

const rotToQuat = (rot) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(rot[0], rot[1], rot[2], 0, rot[3], rot[4], rot[5], 0, rot[6], rot[7], rot[8], 0, 0, 0, 0, 1));

/**
 * Convert a KeyframeSequence into a clip for BlockRig.Animator.
 * @param {object[]} roots instances from parseRbxm()
 * @param {{ rigType?: "R15"|"R6", name?: string, cubicLegacy?: "runtime"|"named" }} [o]
 *   rigType: which rig the animation was made for (R6 poses are converted out of their rotated joint frames).
 *   cubicLegacy: legacy EasingStyle.Cubic plays with its direction reversed at runtime (the reason CubicV2
 *   exists); "runtime" (default) reproduces that, "named" uses the direction as written.
 */
export function keyframeSequenceToClip(roots, o = {}) {
  const ks = findInstance(roots, (x) => x.className === "KeyframeSequence");
  if (!ks) throw new Error("blockrig: no KeyframeSequence in this model (CurveAnimation is not supported yet)");
  const rigType = (o.rigType || "R15").toUpperCase(), legacy = o.cubicLegacy || "runtime";
  const keyframes = [], markers = [];
  const frames = ks.children.filter((c) => c.className === "Keyframe").sort((a, b) => (a.props.Time || 0) - (b.props.Time || 0));
  const qC0 = new THREE.Quaternion(), qC0i = new THREE.Quaternion(), v = new THREE.Vector3();
  for (const kf of frames) {
    const t = kf.props.Time || 0, poses = {};
    const walk = (node) => {
      for (const c of node.children) {
        if (c.className === "KeyframeMarker") markers.push({ t, name: c.props.Name, value: c.props.Value ?? "" });
        if (c.className !== "Pose") continue;
        const name = c.props.Name;
        if (name !== "HumanoidRootPart") {
          const cf = c.props.CFrame || { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 0, 0] };
          const q = rotToQuat(cf.rot || [1, 0, 0, 0, 1, 0, 0, 0, 1]); v.fromArray(cf.pos);
          const c0 = rigType === "R6" && R6_C0_ROTATIONS[name];
          if (c0) { qC0.copy(rotToQuat(c0)); qC0i.copy(qC0).invert(); q.premultiply(qC0).multiply(qC0i); v.applyQuaternion(qC0); }
          let style = POSE_EASING_STYLE[c.props.EasingStyle ?? 0] || "Linear", dir = POSE_EASING_DIRECTION[c.props.EasingDirection ?? 0] || "In";
          if (style === "Cubic" && legacy === "runtime" && dir !== "InOut") dir = dir === "In" ? "Out" : "In";
          if (style === "CubicV2") style = "Cubic";
          const pose = { q: q.toArray(), ease: style, dir, weight: c.props.Weight ?? 1 };
          if (v.lengthSq() > 1e-12) pose.p = v.toArray();
          poses[rigType === "R6" && name === "Torso" ? "Torso" : name] = pose;
        }
        walk(c);
      }
    };
    walk(kf);
    const label = kf.props.Name;
    if (label && label !== "Keyframe") markers.push({ t, name: label });
    keyframes.push({ t, poses });
  }
  const length = keyframes.length ? keyframes[keyframes.length - 1].t : 0;
  return {
    name: o.name || ks.props.Name || "Animation",
    length, loop: ks.props.Loop ?? true, // KeyframeSequence.Loop defaults to true
    priority: ANIMATION_PRIORITY[ks.props.Priority ?? 1000] || "Core",
    keyframes, markers,
  };
}
