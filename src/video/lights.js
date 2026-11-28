// Render speed: every light costs every pixel of every lit material, wherever the light is, so a video with five
// places and their lamps renders every pixel with all of them. Each lamp is owned by the nearest location and is on
// only while the camera is there (the sun and sky lights are shared). Fixes slow renders (nasa: 5 places). BlockRig extra.
//
//   const lamps = lightsByLocation(world.root, { room: V(0,0,0), school: V(600,0,0) })
//   lamps.show(shot.location)          // every frame
import * as THREE from "three";

/** Point, spot and rect-area lights under `root`, each owned by the nearest of `locations` (`{ name: Vector3 }`, x/z). */
export function lightsByLocation(root, locations) {
  root.updateMatrixWorld(true);
  const lamps = [], p = new THREE.Vector3(), names = Object.keys(locations);
  root.traverse((o) => {
    if (!o.isLight || o.isDirectionalLight || o.isHemisphereLight || o.isAmbientLight || o.userData.shared) return;
    o.getWorldPosition(p);
    let best = names[0], bd = Infinity;
    for (const k of names) { const v = locations[k], d = Math.hypot(p.x - v.x, p.z - v.z); if (d < bd) { bd = d; best = k; } }
    lamps.push({ light: o, at: best });
  });
  return {
    lamps,
    /** Turn on the lamps of `location` and off everyone else's (an unknown location turns all of them on). */
    show(location) { const known = names.includes(location); for (const l of lamps) l.light.visible = !known || l.at === location; },
  };
}
