import * as THREE from "three";

/** CPU-skinned world position of vertex i of a SkinnedMesh (works on old and new three.js). */
export function skinnedWorld(sm, i) {
  sm.parent.updateMatrixWorld(true);
  sm.skeleton.update();
  const v = new THREE.Vector3().fromBufferAttribute(sm.geometry.attributes.position, i);
  if (sm.applyBoneTransform) sm.applyBoneTransform(i, v); else sm.boneTransform(i, v);
  return v.applyMatrix4(sm.matrixWorld);
}

export const r3 = (v) => v.toArray().map((x) => Math.round(x * 1000) / 1000 + 0);
