// The video: a ThreeCanvas with the world, the cast and the camera, then the 2D layers (lightning, vignette,
// glitch cuts, captions), the soundtrack, and the debug overlay when { debug: true }.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Captions, Soundtrack, Vignette, FlashCut, LightningFlash, DebugOverlay, applyCamera, useAssetLibrary, type AssetLibrary } from "./kit";
import { ASSETS } from "./world/assets";
import { useRobloxCast, type RobloxCast } from "./cast/roblox";
import { T, weatherAt, daylightAt } from "./story";
import { buildCast } from "./cast/characters";
import { buildWorld } from "./world/World";
import { perform } from "./direction/performance";
import { cameraFor } from "./direction/camera";

export type VideoProps = { debug?: boolean; roblox?: boolean }; // roblox: local Roblox items (never publish)

function Scene({ lib, rb }: { lib: AssetLibrary; rb: RobloxCast | null }) {
  const frame = useCurrentFrame(), time = frame / T.FPS;
  const { camera, gl, scene } = useThree() as any;
  // straight to the canvas with AgX tone mapping and soft shadows (an EffectComposer blanks Remotion's frames)
  const world = useMemo(() => { gl.toneMapping = THREE.AgXToneMapping; gl.shadowMap.type = THREE.PCFShadowMap; return buildWorld(gl, scene, lib); }, [gl, scene, lib]);
  const cast = useMemo(() => buildCast(rb), [rb]);
  const { shot, local, p } = T.shotAt(time);
  const state = perform(shot, local, p, cast, world);
  for (const q of cast.all) q.rig.object.updateMatrixWorld(true);
  applyCamera(camera, cameraFor(shot, p, local, cast, world), frame);
  camera.updateMatrixWorld(true);
  world.update({ location: shot.location ?? "street", weather: weatherAt(shot, p), daylight: daylightAt(shot, p), time, local, camera, cloudAt: state.cloudAt });
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

export const Video: React.FC<VideoProps> = ({ debug, roblox }) => {
  const { width, height } = useVideoConfig();
  // downloaded models, skies and textures: loaded before the canvas mounts (delayRender holds the render), because
  // ThreeCanvas only redraws on frame changes, not on state changes inside it
  const lib = useAssetLibrary(ASSETS);
  const rb = useRobloxCast(!!roblox); // undefined while loading, null when off
  return (
    <AbsoluteFill style={{ background: "#0b0d14" }}>
      {lib && rb !== undefined && <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
        camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 10, 30] }}>
        <Scene lib={lib} rb={rb} />
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
