// blockrig/remotion/post: post effects for the final frame: ambient occlusion (N8AO: soft contact shadows where blocks
// meet the ground, in corners, under hair), bloom on bright things only (fire, lamps, neon), SMAA or MSAA, and ACES
// tone mapping with the renderer's exposure. Rendered from a priority-1 useFrame (usePost), so Remotion's
// frame-by-frame rendering and Studio's live preview both go through it. Every effect is a function of the frame (no
// temporal accumulation), so frames rendered in parallel tabs match. Peer dependencies: react, remotion,
// @react-three/fiber, postprocessing, n8ao. BlockRig extra.
//
//   const post = usePost(POST_DEFAULTS)       // inside the ThreeCanvas tree, once
//   post.set({ ao: 0 })                       // per shot, if a shot needs it different
//
// Fixes carried in: a NaN / Infinity pixel (some materials, the HDR sky's sun) used to spread through bloom's blur and
// black out whole daylight frames: every pixel is sanitised before the blurs, and bloom uses the Kawase blur. A tab's
// first effects render came out black while shaders compiled: the first frame renders twice.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, SMAAEffect, Effect } from "postprocessing";
import { N8AOPostPass } from "n8ao";

/** ao: occlusion strength (0 = off) and radius in studs; bloom over bloomThreshold (HDR); msaa samples (0 = SMAA). */
export const POST_DEFAULTS = { ao: 1.8, aoRadius: 2.5, bloom: 0.6, bloomThreshold: 1.35, msaa: 0 };

/** Keeps every pixel a finite colour in 0..64 before the blurs (NaN / Infinity become black). */
class SanitizeEffect extends Effect {
  constructor() {
    super("Sanitize", `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec3 c = inputColor.rgb;
      bool bad = any(isnan(c)) || any(isinf(c));
      outputColor = vec4(bad ? vec3(0.0) : clamp(c, vec3(0.0), vec3(64.0)), bad ? 1.0 : inputColor.a);
    }`);
  }
}

export function createPost(gl, scene, camera, w, h, o = POST_DEFAULTS) {
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: o.msaa });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera, new SanitizeEffect()));
  const ao = new N8AOPostPass(scene, camera, w, h);
  Object.assign(ao.configuration, { aoRadius: o.aoRadius, distanceFalloff: 1.2, intensity: o.ao, halfRes: true, depthAwareUpsampling: true, color: new THREE.Color(0, 0, 0), aoSamples: 12, denoiseSamples: 8, denoiseRadius: 10 });
  ao.setQualityMode("Medium"); ao.configuration.halfRes = true;
  composer.addPass(ao);
  composer.addPass(new EffectPass(camera, new SanitizeEffect()));
  const bloom = new BloomEffect({ intensity: o.bloom, luminanceThreshold: o.bloomThreshold, luminanceSmoothing: 0.25, mipmapBlur: false });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const effects = [bloom, tone]; if (!o.msaa) effects.push(new SMAAEffect());
  composer.addPass(new EffectPass(camera, ...effects));
  composer.setSize(w, h, false);
  let cur = { ...o }, warm = false;
  return {
    composer,
    set(p) {
      cur = { ...cur, ...p };
      ao.enabled = cur.ao > 0; ao.configuration.intensity = cur.ao; ao.configuration.aoRadius = cur.aoRadius;
      bloom.intensity = cur.bloom; bloom.luminanceMaterial.threshold = cur.bloomThreshold;
    },
    /** `seconds`: the video time. N8AO seeds its noise from performance.now(); it gets the video time instead. */
    render(seconds = 0) {
      const tm = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping;
      const now = performance.now; performance.now = () => seconds * 1000;
      try { if (!warm) { composer.render(); warm = true; } composer.render(); } finally { performance.now = now; }
      gl.toneMapping = tm;
    },
    dispose() { composer.dispose(); },
  };
}

/** Render the scene through the post effects (a priority-1 useFrame replaces R3F's own render). */
export function usePost(o = POST_DEFAULTS, enabled = true) {
  const { gl, scene, camera } = useThree();
  // the video's own size, not the canvas's measured size (it can still be 0 on a tab's first frames)
  const { width, height, fps } = useVideoConfig(), frame = useCurrentFrame();
  const post = useMemo(() => (enabled ? createPost(gl, scene, camera, width, height, o) : null), [gl, scene, camera, width, height, enabled]);
  useEffect(() => () => post?.dispose(), [post]);
  useFrame(() => { if (post) post.render(frame / fps); else gl.render(scene, camera); }, 1);
  return post;
}
