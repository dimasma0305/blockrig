// The video: a ThreeCanvas with the neon world, the cast and the camera; the shot's weather (rain, lightning);
// glitch cuts, scanlines and a vignette; captions; narration and music; the debug overlay when { debug: true }.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Captions, Soundtrack, Vignette, Scanlines, GlitchCut, LightningFlash, DebugOverlay, useAssetLibrary, type AssetLibrary } from "./kit";
import { ASSETS } from "./world/assets";
import { T, weatherAt } from "./story";
import { buildCast } from "./cast/characters";
import { buildWorld } from "./world/World";
import { perform } from "./direction/performance";
import { cameraFor, applyCamera } from "./direction/camera";

export type VideoProps = { debug?: boolean };

function Scene({ lib }: { lib: AssetLibrary }) {
  const frame = useCurrentFrame(), time = frame / T.FPS;
  const { camera, gl, scene } = useThree() as any;
  // straight to the canvas with AgX tone mapping and soft shadows (an EffectComposer blanks Remotion's frames)
  const world = useMemo(() => { gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1.25; gl.shadowMap.type = THREE.PCFShadowMap; return buildWorld(gl, scene, lib); }, [gl, scene, lib]);
  const cast = useMemo(() => buildCast(), []);
  const { shot, local, p } = T.shotAt(time);
  const { state, focus } = perform(shot, local, p, time, cast);
  for (const q of cast.all) q.rig.object.updateMatrixWorld(true);
  applyCamera(camera, cameraFor(shot, p, local, cast), time);
  camera.updateMatrixWorld(true);
  world.update(state, time, focus, { weather: weatherAt(shot, p), local, camera });
  return (
    <>
      <primitive object={world.root} />
      {cast.all.map((q, i) => <primitive key={i} object={q.rig.object} />)}
    </>
  );
}

function Lightning() {
  const frame = useCurrentFrame(), { shot, local, p } = T.shotAt(frame / T.FPS);
  return <LightningFlash strikes={weatherAt(shot, p).lightning} local={local} />;
}

export const Video: React.FC<VideoProps> = ({ debug }) => {
  const { width, height } = useVideoConfig();
  const lib = useAssetLibrary(ASSETS); // downloaded models and textures, loaded before the canvas mounts
  return (
    <AbsoluteFill style={{ background: "#060a1e" }}>
      {lib && <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
        camera={{ fov: 50, near: 0.05, far: 1200, position: [0, 10, 30] }}>
        <Scene lib={lib} />
      </ThreeCanvas>}
      <Lightning />
      <Scanlines alpha={0.1} />
      <Vignette strength={0.55} />
      <GlitchCut timeline={T} shots={["s05", "s07", "s10", "s12"]} />
      <Captions captions={T.CAPTIONS} />
      <Soundtrack timeline={T} />
      {debug ? <DebugOverlay timeline={T} /> : null}
    </AbsoluteFill>
  );
};
