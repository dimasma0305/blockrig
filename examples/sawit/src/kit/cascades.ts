// Sun shadows that reach the horizon: cascaded shadow maps (three's CSM, examples/jsm/csm). A single shadow map
// covers one box around the camera (here 120 x 120 studs): everything outside it had no shadow at all, so wide shots
// (hills of palms, houses across the square, crane shots) looked flat. CSM splits the view into cascades, sharp up
// close and coarser far away, each with its own shadow map, and follows the camera. Frame-pure (camera only).
//
//   const sun = createCascades(scene, camera, { maxFar: 700 })   // once, when the camera exists
//   sun.update(lighting.sun)                                     // every frame, after the camera and the sun are set
//
// It replaces the scene's own sun shadow (`lighting.sun` stops casting, its light comes from the cascades) and
// prepares every lit material it meets (CSM patches their shaders); materials with their own onBeforeCompile keep
// the single-map shadow.
import * as THREE from "three";
import { CSM } from "three/examples/jsm/csm/CSM.js";

export type Cascades = { csm: CSM; update(sun: THREE.DirectionalLight): void };

export function createCascades(scene: THREE.Scene, camera: THREE.PerspectiveCamera, o: { maxFar?: number; cascades?: number; mapSize?: number } = {}): Cascades {
  const csm = new CSM({
    camera, parent: scene, cascades: o.cascades ?? 3, maxFar: o.maxFar ?? 700, mode: "practical",
    shadowMapSize: o.mapSize ?? 2048, shadowBias: -0.0002, lightMargin: 250, lightIntensity: 0, lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
  } as any);
  (csm as any).fade = true;
  for (const l of csm.lights) { l.shadow.normalBias = 0.04; l.shadow.radius = 2; }
  const done = new WeakSet<THREE.Material>(), base = THREE.Material.prototype.onBeforeCompile;
  const prepare = () => scene.traverse((m: any) => {
    if (!m.isMesh && !m.isInstancedMesh) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as any[]) {
      if (!mat || done.has(mat)) continue; done.add(mat);
      if (!(mat.isMeshStandardMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial)) continue;
      if (mat.onBeforeCompile !== base) continue; // someone else patches this shader: leave it on the plain shadow
      csm.setupMaterial(mat); mat.needsUpdate = true;
    }
  });
  let frames = 0;
  return {
    csm,
    update(sun) {
      if (frames++ % 30 === 0 || frames < 3) prepare(); // new materials appear when the cast or a prop first shows
      sun.castShadow = false; sun.visible = false;   // the cascades are the sun now
      const dir = sun.target.position.clone().sub(sun.position).normalize();
      csm.lightDirection.copy(dir);
      for (const l of csm.lights) { l.color.copy(sun.color); l.intensity = sun.intensity; }
      camera.updateMatrixWorld(true); csm.updateFrustums(); csm.update();
    },
  };
}
