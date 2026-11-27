// The video: a ThreeCanvas with the neon world, the cast and the camera; the shot's weather (rain, lightning);
// glitch cuts, scanlines and a vignette; captions; narration and music; the debug overlay when { debug: true }.
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Captions, Soundtrack, Vignette, Scanlines, GlitchCut, LightningFlash, DebugOverlay, useAssetLibrary, type AssetLibrary } from "./kit";
import { ASSETS } from "./world/assets";
import { createProbe, loadRapier } from "./kit/collide";
import { T, weatherAt } from "./story";
import { buildCast } from "./cast/characters";
import { buildWorld } from "./world/World";
import { perform } from "./direction/performance";
import { cameraFor, applyCamera } from "./direction/camera";

// collide: log staging problems per frame (npm run collide)
export type VideoProps = { debug?: boolean; collide?: boolean };

function Scene({ lib, rapier }: { lib: AssetLibrary; rapier: any }) {
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
  const probe = useMemo(() => (rapier ? createProbe(rapier, world.root) : null), [rapier, world]);
  if (probe) console.log("COLLIDE " + JSON.stringify({ frame, shot: shot.id, issues: probe.check(camera, cast.all) }));
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

/** Rapier for the collision check: undefined while loading, null when off. */
function useRapier(enabled: boolean) {
  const [r, setR] = useState<any>(enabled ? undefined : null);
  const [handle] = useState(() => (enabled ? delayRender("Loading Rapier") : null));
  useEffect(() => { if (handle !== null) loadRapier().then((x) => { setR(x); continueRender(handle); }).catch((e) => cancelRender(e)); }, [handle]);
  return r;
}

export const Video: React.FC<VideoProps> = ({ debug, collide }) => {
  const { width, height } = useVideoConfig();
  const lib = useAssetLibrary(ASSETS); // downloaded models and textures, loaded before the canvas mounts
  const rapier = useRapier(!!collide);
  return (
    <AbsoluteFill style={{ background: "#060a1e" }}>
      {lib && rapier !== undefined && <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
        camera={{ fov: 50, near: 0.05, far: 1200, position: [0, 10, 30] }}>
        <Scene lib={lib} rapier={rapier} />
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
