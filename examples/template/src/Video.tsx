// The video: a ThreeCanvas with the world, the cast and the camera, then the 2D layers (lightning, vignette,
// glitch cuts, captions), the soundtrack, and the debug overlay when { debug: true }.
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Captions, Soundtrack, Vignette, FlashCut, LightningFlash, DebugOverlay, applyCamera, useAssetLibrary, type AssetLibrary } from "./kit";
import { ASSETS } from "./world/assets";
import { createProbe, loadRapier } from "./kit/collide";
import { useRobloxCast, type RobloxCast } from "./cast/roblox";
import { T, weatherAt, daylightAt } from "./story";
import { buildCast } from "./cast/characters";
import { buildWorld } from "./world/World";
import { perform } from "./direction/performance";
import { cameraFor } from "./direction/camera";

// roblox: local Roblox items (never publish); collide: log staging problems per frame (npm run collide)
export type VideoProps = { debug?: boolean; roblox?: boolean; collide?: boolean };

function Scene({ lib, rb, rapier }: { lib: AssetLibrary; rb: RobloxCast | null; rapier: any }) {
  const frame = useCurrentFrame(), time = frame / T.FPS;
  const { camera, gl, scene } = useThree() as any;
  // straight to the canvas with AgX tone mapping and soft shadows (an EffectComposer blanks Remotion's frames)
  const world = useMemo(() => { gl.toneMapping = THREE.AgXToneMapping; gl.shadowMap.type = THREE.PCFShadowMap; return buildWorld(gl, scene, lib, rb); }, [gl, scene, lib, rb]);
  const cast = useMemo(() => buildCast(rb), [rb]);
  const { shot, local, p } = T.shotAt(time);
  const state = perform(shot, local, p, cast, world);
  for (const q of cast.all) q.rig.object.updateMatrixWorld(true);
  applyCamera(camera, cameraFor(shot, p, local, cast, world), frame);
  camera.updateMatrixWorld(true);
  world.update({ location: shot.location ?? "street", weather: weatherAt(shot, p), daylight: daylightAt(shot, p), time, local, camera, cloudAt: state.cloudAt });
  const probe = useMemo(() => (rapier ? createProbe(rapier, world.root) : null), [rapier, world]);
  if (probe) console.log("COLLIDE " + JSON.stringify({ frame, shot: shot.id, issues: probe.check(camera, cast.all) }));
  return (
    <>
      {cast.all.map((q, i) => <primitive key={i} object={q.rig.object} />)}
    </>
  );
}

/** Lightning flash over the whole frame for shots whose weather has strikes. */
function Lightning() {
  const frame = useCurrentFrame(), { shot, local, p } = T.shotAt(frame / T.FPS);
  if (shot.location === "bedroom") return null;
  return <LightningFlash strikes={weatherAt(shot, p).lightning} local={local} />;
}

/** Rapier for the collision check: undefined while loading, null when off. */
function useRapier(enabled: boolean) {
  const [r, setR] = useState<any>(enabled ? undefined : null);
  const [handle] = useState(() => (enabled ? delayRender("Loading Rapier") : null));
  useEffect(() => { if (handle !== null) loadRapier().then((x) => { setR(x); continueRender(handle); }).catch((e) => cancelRender(e)); }, [handle]);
  return r;
}

export const Video: React.FC<VideoProps> = ({ debug, roblox, collide }) => {
  const { width, height } = useVideoConfig();
  // downloaded models, skies and textures: loaded before the canvas mounts (delayRender holds the render), because
  // ThreeCanvas only redraws on frame changes, not on state changes inside it
  const lib = useAssetLibrary(ASSETS);
  const rb = useRobloxCast(!!roblox); // undefined while loading, null when off
  const rapier = useRapier(!!collide);
  return (
    <AbsoluteFill style={{ background: "#0b0d14" }}>
      {lib && rb !== undefined && rapier !== undefined && <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
        camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 10, 30] }}>
        <Scene lib={lib} rb={rb} rapier={rapier} />
      </ThreeCanvas>}
      <Lightning />
      <Vignette strength={0.45} />
      <FlashCut timeline={T} shots={["s04"]} />
      <Captions captions={T.CAPTIONS} />
      <Soundtrack timeline={T} />
      {debug ? <DebugOverlay timeline={T} /> : null}
    </AbsoluteFill>
  );
};
