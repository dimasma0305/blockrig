// The video: a ThreeCanvas with the world, the cast and the camera, then the 2D layers (lightning, vignette,
// glitch cuts, captions), the soundtrack, and the debug overlay when { debug: true }.
import { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { applyLook, Captions, CAPTION_TOP, Soundtrack, Vignette, FlashCut, LightningFlash, DebugOverlay, applyCamera, useAssetLibrary, type AssetLibrary } from "./kit";
import { ASSETS } from "./world/assets";
import { createProbe, loadRapier } from "./kit/collide";
import { usePost, POST_DEFAULTS } from "./kit/post";
import { LightRig, LIGHT_PRESETS } from "./kit/lightRig";
import { SoftShadows } from "@react-three/drei";
import { useRobloxCast, type RobloxCast } from "./cast/roblox";
import { T, weatherAt, daylightAt } from "./story";
import { buildCast } from "./cast/characters";
import { buildWorld } from "./world/World";
import { perform } from "./direction/performance";
import { cameraFor } from "./direction/camera";
import { Layers2D, speakersOf } from "./direction/Layers2D";
import { useBrands } from "./world/brands";
import { GlitchCut } from "./kit";
const SPEAKER_TAGS = speakersOf(T);

// roblox: Roblox items (default once downloaded); collide: log staging problems per frame (npm run collide)
const USES_LIGHT_PRESETS = T.SHOTS.some((s: any) => s.light);
// cam: a fixed camera for checking a layout ({ pos: [x,y,z], target: [x,y,z], fov }), e.g. PROPS='{"cam":{...}}' npm run stills -- s01
export type VideoProps = { debug?: boolean; roblox?: boolean; collide?: boolean; post?: boolean; cam?: { pos: number[]; target: number[]; fov?: number } };

function Scene({ lib, rb, rapier, post = true, cam }: { lib: AssetLibrary; rb: RobloxCast | null; rapier: any; post?: boolean; cam?: VideoProps["cam"] }) {
  const frame = useCurrentFrame(), time = frame / T.FPS;
  usePost(POST_DEFAULTS, post); // ambient occlusion, bloom, MSAA, ACES (src/kit/post.ts); { post: false } renders without
  const { camera, gl, scene } = useThree() as any;
  // straight to the canvas with the kit look (ACES Filmic) and soft shadows (an EffectComposer blanks Remotion's frames)
  const world = useMemo(() => { applyLook(gl); return buildWorld(gl, scene, lib, rb); }, [gl, scene, lib, rb]);
  const cast = useMemo(() => buildCast(rb), [rb]);
  const { shot, local, p } = T.shotAt(time);
  const state = perform(shot, local, p, cast, world);
  for (const q of cast.all) q.rig.object.updateMatrixWorld(true);
  applyCamera(camera, cam ? { pos: new THREE.Vector3(...cam.pos), target: new THREE.Vector3(...cam.target), fov: cam.fov ?? 50, shake: 0 } : cameraFor(shot, p, local, cast, world), frame);
  camera.updateMatrixWorld(true);
  const light = (shot as any).light as string | undefined; // docs/story.md "- light: golden": a lighting preset for this shot
  world.update({ location: shot.location ?? "room", weather: weatherAt(shot, p), daylight: daylightAt(shot, p), time, local, camera, confetti: state.confetti, ownLight: !!(light && LIGHT_PRESETS[light]) });
  // colliders are rebuilt for every shot from what is visible and where it stands then: props that move or show
  // only in some shots would otherwise leave ghost colliders from the first frame (npm run collide)
  const lastProbe = useRef<any>(null);
  const probe = useMemo(() => { lastProbe.current?.free?.(); lastProbe.current = rapier ? createProbe(rapier, world.root) : null; return lastProbe.current; }, [rapier, world, shot.id]);
  // while a caption is on screen, a watched face inside its band is a problem too ("caption-over-face")
  const captionBand: [number, number] | undefined = T.captionAt(time) ? [CAPTION_TOP - 0.03, CAPTION_TOP + 0.07] : undefined;
  if (probe) console.log("COLLIDE " + JSON.stringify({ frame, shot: shot.id, issues: probe.check(camera, cast.all, { captions: captionBand }) }));
  return (
    <>
      {/* soft (PCSS) shadows for the whole video when any shot names a preset; that shot's image-based light */}
      {USES_LIGHT_PRESETS && <SoftShadows size={18} samples={10} focus={0.6} />}
      {light && LIGHT_PRESETS[light] && <LightRig key={light} preset={light} softShadows={false} />}
      {cast.all.map((q, i) => <primitive key={i} object={q.rig.object} />)}
    </>
  );
}

/** Lightning flash over the whole frame for shots whose weather has strikes. */
function Lightning() {
  const frame = useCurrentFrame(), { shot, local, p } = T.shotAt(frame / T.FPS);
  return null;
  return <LightningFlash strikes={weatherAt(shot, p).lightning} local={local} />;
}

/** Rapier for the collision check: undefined while loading, null when off. */
function useRapier(enabled: boolean) {
  const [r, setR] = useState<any>(enabled ? undefined : null);
  const [handle] = useState(() => (enabled ? delayRender("Loading Rapier") : null));
  useEffect(() => { if (handle !== null) loadRapier().then((x) => { setR(x); continueRender(handle); }).catch((e) => cancelRender(e)); }, [handle]);
  return r;
}

export const Video: React.FC<VideoProps> = ({ debug, roblox, collide, post, cam }) => {
  const { width, height } = useVideoConfig();
  // downloaded models, skies and textures: loaded before the canvas mounts (delayRender holds the render), because
  // ThreeCanvas only redraws on frame changes, not on state changes inside it
  const lib = useAssetLibrary(ASSETS);
  const rb = useRobloxCast(!!roblox); // undefined while loading, null when off
  const rapier = useRapier(!!collide);
  const brands = useBrands(); // real avatars, logos and thumbnails for the boards (src/world/brands.ts)
  return (
    <AbsoluteFill style={{ background: "#0b0d14" }}>
      {lib && brands && rb !== undefined && rapier !== undefined && <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: post === false, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
        camera={{ fov: 50, near: 0.3, far: 2000, position: [0, 10, 30] }}>
        <Scene lib={lib} rb={rb} rapier={rapier} post={post !== false} cam={cam} />
      </ThreeCanvas>}
      <Lightning />
      <Vignette strength={0.45} />
      <FlashCut timeline={T} shots={["s06", "s29", "s57", "s59"]} />
      <GlitchCut timeline={T} shots={["s04", "s54", "s61"]} />
      <Layers2D timeline={T} />
      <Captions captions={T.CAPTIONS} speakers={SPEAKER_TAGS} />
      <Soundtrack timeline={T} />
      {debug ? <DebugOverlay timeline={T} /> : null}
    </AbsoluteFill>
  );
};
