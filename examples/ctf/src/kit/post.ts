// Post effects for the final frame: ambient occlusion (N8AO: soft contact shadows where blocks meet the ground,
// in corners, under hair), bloom on bright things only (fire, lamps, neon, sun glints), 4x MSAA, and ACES tone
// mapping with the renderer's exposure. Rendered from a priority-1 useFrame (usePost), so Remotion's frame-by-frame
// rendering and Studio's live preview both go through it. Every effect is a function of the frame (no temporal
// accumulation), so frames rendered in parallel tabs match.
//
//   const post = usePost(POST_DEFAULTS)       // inside the ThreeCanvas tree, once
//   post.set({ ao: 0 })                       // per shot, if a shot needs it different
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, SMAAEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";

export type PostOpts = {
  /** ambient occlusion strength (0 = off) and radius in studs */
  ao: number; aoRadius: number;
  /** bloom strength (0 = off); only pixels brighter than `bloomThreshold` (HDR, before tone mapping) glow */
  bloom: number; bloomThreshold: number;
  /** multisample anti-aliasing samples; 0 = SMAA instead (default: as sharp, 1/8 faster: 40 s vs 45 s per 180 frames) */
  msaa: number;
};
export const POST_DEFAULTS: PostOpts = { ao: 1.8, aoRadius: 2.5, bloom: 0.6, bloomThreshold: 1.35, msaa: 0 }; // threshold above sunlit white (white shoes glowed at 0.95): only fire, lamps, neon bloom

export function createPost(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number, o: PostOpts = POST_DEFAULTS) {
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: o.msaa });
  composer.addPass(new RenderPass(scene, camera));
  const ao = new N8AOPostPass(scene, camera, w, h);
  Object.assign(ao.configuration, { aoRadius: o.aoRadius, distanceFalloff: 1.2, intensity: o.ao, halfRes: true, depthAwareUpsampling: true, color: new THREE.Color(0, 0, 0), aoSamples: 12, denoiseSamples: 8, denoiseRadius: 10 });
  ao.setQualityMode("Medium"); ao.configuration.halfRes = true;
  composer.addPass(ao);
  const bloom = new BloomEffect({ intensity: o.bloom, luminanceThreshold: o.bloomThreshold, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const effects: any[] = [bloom, tone]; if (!o.msaa) effects.push(new SMAAEffect());
  composer.addPass(new EffectPass(camera, ...effects));
  composer.setSize(w, h, false);
  let cur = { ...o };
  return {
    composer,
    set(p: Partial<PostOpts>) {
      cur = { ...cur, ...p };
      ao.enabled = cur.ao > 0; ao.configuration.intensity = cur.ao; ao.configuration.aoRadius = cur.aoRadius;
      bloom.intensity = cur.bloom; bloom.luminanceMaterial.threshold = cur.bloomThreshold;
    },
    render() {
      // tone mapping happens in the last pass (ToneMappingEffect, with gl.toneMappingExposure), not in every material
      const tm = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping;
      composer.render();
      gl.toneMapping = tm;
    },
    dispose() { composer.dispose(); },
  };
}
export type Post = ReturnType<typeof createPost>;

/** Render the scene through the post effects (a priority-1 useFrame replaces R3F's own render). */
export function usePost(o: PostOpts = POST_DEFAULTS, enabled = true) {
  const { gl, scene, camera, size } = useThree() as any;
  const post = useMemo(() => (enabled ? createPost(gl, scene, camera, size.width, size.height, o) : null), [gl, scene, camera, size.width, size.height, enabled]);
  useEffect(() => () => post?.dispose(), [post]);
  useFrame(() => { if (post) post.render(); else gl.render(scene, camera); }, 1);
  return post;
}
