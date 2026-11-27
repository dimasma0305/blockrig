// IKControl, like Roblox's: solve a chain of joints, from ChainRoot to EndEffector, so the effector reaches a
// Target, applied on top of the animated pose with a Weight. Types:
//   Position  - the EndEffector's point (part centre or attachment) moves to the target position
//   Rotation  - the EndEffector part turns to the target's orientation
//   Transform - both
//   LookAt    - the EndEffector's front (-Z) turns towards the target, shared along the chain
// Pole (optional) picks the bend direction of the chain, like Roblox's IKControl.Pole. Controls run in Priority
// order (higher last). The solver is cyclic coordinate descent in world space; Roblox's own solver isn't
// published, so results can differ in detail (and SmoothTime and joint constraints are not applied).
import * as THREE from "three";

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();

// rotate a bone by a world-space rotation q (about its own origin)
function turn(bone, q) {
  bone.getWorldQuaternion(_wq); _wq.premultiply(q);
  if (bone.parent) { bone.parent.getWorldQuaternion(_pq); _wq.premultiply(_pq.invert()); }
  bone.quaternion.copy(_wq); bone.updateMatrixWorld(true);
}

/** Point the chain at `target` (world) with CCD; `effector()` returns the effector's world point. */
export function solvePosition(chain, effector, target, { iterations = 12, tolerance = 1e-4 } = {}) {
  for (let it = 0; it < iterations; it++) {
    for (let j = chain.length - 1; j >= 0; j--) {
      const bone = chain[j]; bone.getWorldPosition(_a);
      _b.copy(effector()).sub(_a); _c.copy(target).sub(_a);
      if (_b.lengthSq() < 1e-12 || _c.lengthSq() < 1e-12) continue;
      _q.setFromUnitVectors(_b.normalize(), _c.normalize()); turn(bone, _q);
    }
    if (effector().distanceTo(target) < tolerance) break;
  }
}

/** Swing the chain about the root->effector line so its first bend points towards `pole` (world). */
export function applyPole(chain, effector, pole) {
  if (chain.length < 2) return;
  const root = chain[0].getWorldPosition(new THREE.Vector3()), axis = effector().clone().sub(root);
  if (axis.lengthSq() < 1e-12) return; axis.normalize();
  const mid = chain[1].getWorldPosition(new THREE.Vector3()).sub(root), want = pole.clone().sub(root);
  mid.addScaledVector(axis, -mid.dot(axis)); want.addScaledVector(axis, -want.dot(axis));
  if (mid.lengthSq() < 1e-10 || want.lengthSq() < 1e-10) return;
  mid.normalize(); want.normalize();
  const angle = Math.atan2(_a.crossVectors(mid, want).dot(axis), mid.dot(want));
  turn(chain[0], _q.setFromAxisAngle(axis, angle));
}

/** Give `bone` the world orientation `worldQ`. */
export function solveRotation(bone, worldQ) {
  if (bone.parent) { bone.parent.getWorldQuaternion(_pq); bone.quaternion.copy(_pq.invert().multiply(worldQ)); }
  else bone.quaternion.copy(worldQ);
  bone.updateMatrixWorld(true);
}

/** Turn the chain so `forward()` (the effector's world front) points at `target`, shared along the chain. */
export function solveLookAt(chain, origin, forward, target) {
  for (let j = 0; j < chain.length; j++) {
    const f = forward().normalize(), want = _c.copy(target).sub(origin()).normalize();
    if (want.lengthSq() < 1e-12) return;
    const full = _q.setFromUnitVectors(f, want), share = new THREE.Quaternion().slerp(full, 1 / (chain.length - j));
    turn(chain[j], share);
  }
}
