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
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, SMAAEffect, Effect } from "postprocessing";
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

/** Keeps every pixel a finite colour in 0..64 before the blurs. Negative colours (some materials and the HDR sky
 *  give a few) made bloom's mip blur divide by zero (its 1 / (1 + luma) weights): NaN spread over the whole frame and
 *  daylight wide shots came out black. NaN / Infinity become black, values clamp to 0..64. After the scene and AO. */
class SanitizeEffect extends Effect {
  constructor() {
    super("Sanitize", `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec3 c = inputColor.rgb;
      bool bad = any(isnan(c)) || any(isinf(c));
      outputColor = vec4(bad ? vec3(0.0) : clamp(c, vec3(0.0), vec3(64.0)), bad ? 1.0 : inputColor.a);
    }`);
  }
}

export function createPost(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number, o: PostOpts = POST_DEFAULTS) {
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: o.msaa });
  composer.addPass(new RenderPass(scene, camera));
  // the HDR sky's sun is brighter than a half float holds (Infinity): clamp it before any blur (AO's denoise, bloom's
  // mip chain) spreads it into NaN over the whole frame (wide shots facing the sun came out black)
  composer.addPass(new EffectPass(camera, new SanitizeEffect()));
  const ao = new N8AOPostPass(scene, camera, w, h);
  Object.assign(ao.configuration, { aoRadius: o.aoRadius, distanceFalloff: 1.2, intensity: o.ao, halfRes: true, depthAwareUpsampling: true, color: new THREE.Color(0, 0, 0), aoSamples: 12, denoiseSamples: 8, denoiseRadius: 10 });
  ao.setQualityMode("Medium"); ao.configuration.halfRes = true;
  composer.addPass(ao);
  composer.addPass(new EffectPass(camera, new SanitizeEffect())); // its own pass: bloom reads this pass's output
  // Kawase blur, not the mipmap blur: on some daylight frames the mipmap blur turned the whole frame black (NaN),
  // even with every input pixel sanitized; Kawase never did
  const bloom = new BloomEffect({ intensity: o.bloom, luminanceThreshold: o.bloomThreshold, luminanceSmoothing: 0.25, mipmapBlur: false });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const effects: any[] = [bloom, tone]; if (!o.msaa) effects.push(new SMAAEffect());
  composer.addPass(new EffectPass(camera, ...effects));
  composer.setSize(w, h, false);
  let cur = { ...o }, warm = false;
  return {
    composer,
    set(p: Partial<PostOpts>) {
      cur = { ...cur, ...p };
      ao.enabled = cur.ao > 0; ao.configuration.intensity = cur.ao; ao.configuration.aoRadius = cur.aoRadius;
      bloom.intensity = cur.bloom; bloom.luminanceMaterial.threshold = cur.bloomThreshold;
    },
    /** `seconds`: the video time. N8AO seeds its noise from performance.now(); it is given the video time instead,
     *  so a frame looks the same whichever tab renders it (frame-pure). */
    render(seconds = 0) {
      // tone mapping happens in the last pass (ToneMappingEffect, with gl.toneMappingExposure), not in every material
      const tm = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping;
      const now = performance.now; (performance as any).now = () => seconds * 1000;
      // a tab's first effects render comes out black (shaders still compiling): render it twice the first time
      try { if (!warm) { composer.render(); warm = true; } composer.render(); } finally { (performance as any).now = now; }
      gl.toneMapping = tm;
    },
    dispose() { composer.dispose(); },
  };
}
export type Post = ReturnType<typeof createPost>;

/** Render the scene through the post effects (a priority-1 useFrame replaces R3F's own render). */
export function usePost(o: PostOpts = POST_DEFAULTS, enabled = true) {
  const { gl, scene, camera } = useThree() as any;
  // the video's own size, not the canvas's measured size: that can still be 0 on a tab's first frames (they came out
  // black, seconds of them when 8 tabs start at once)
  const { width, height, fps } = useVideoConfig(), frame = useCurrentFrame();
  const post = useMemo(() => (enabled ? createPost(gl, scene, camera, width, height, o) : null), [gl, scene, camera, width, height, enabled]);
  useEffect(() => () => post?.dispose(), [post]);
  useFrame(() => { if (post) post.render(frame / fps); else gl.render(scene, camera); }, 1);
  return post;
}
