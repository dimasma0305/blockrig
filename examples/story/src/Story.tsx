// The composition: a ThreeCanvas with the world, the cast and the camera; narration and music; captions.
import { useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAssets, type Assets } from "./lib/assets";
import { buildCast } from "./characters";
import { perform } from "./performance";
import { cameraFor, applyCamera } from "./camera";
import { World } from "./World";
import { Captions } from "./Captions";
import { SHOTS, MUSIC, shotAt, FPS } from "./timeline";


function Scene({ assets }: { assets: Assets }) {
  const frame = useCurrentFrame(), time = frame / FPS;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  // render straight to the canvas with AgX tone mapping and soft shadows (an EffectComposer takes over the
  // render loop and leaves Remotion's captured frame blank)
  useMemo(() => { gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1.15; gl.shadowMap.type = THREE.PCFSoftShadowMap; }, [gl]);
  const cast = useMemo(() => buildCast(), []);
  const { shot, local, p } = shotAt(time);

  // characters first (camera targets follow their joints), then the camera
  const env = perform(shot, local, p, time, cast);
  for (const r of [cast.kid, cast.statue, ...cast.folks]) { r.updateFace(0); r.object.updateMatrixWorld(true); }
  const cam = cameraFor(shot, p, local, cast);
  applyCamera(camera, cam, time);

  return (
    <>
      <World assets={assets} time={time} snowFall={env.snowFall} cover={env.cover} focus={cam.target} />
      <primitive object={cast.kid.object} />
      <primitive object={cast.statue.object} />
      {cast.folks.map((f, i) => <primitive key={i} object={f.object} />)}
    </>
  );
}

// a quick white flash on the cuts that land a surprise
const FLASH_ON = new Set(["s07", "s08", "s13"]);
function CutFlash() {
  const frame = useCurrentFrame();
  const hit = SHOTS.find((s) => FLASH_ON.has(s.id) && frame >= s.startFrame && frame < s.startFrame + 6);
  if (!hit) return null;
  const o = interpolate(frame - hit.startFrame, [0, 6], [0.85, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#ffffff", opacity: o }} />;
}

export const Story: React.FC = () => {
  const { width, height } = useVideoConfig();
  const assets = useAssets();
  return (
    <AbsoluteFill style={{ background: "#9fd3ff" }}>
      {assets && (
        <ThreeCanvas width={width} height={height} shadows dpr={1}
          gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
          camera={{ fov: 50, near: 0.1, far: 900, position: [20, 12, 20] }}>
          <Scene assets={assets} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)", pointerEvents: "none" }} />
      <CutFlash />
      <Captions />
      {SHOTS.filter((s) => s.audio).map((s) => (
        <Sequence key={s.id} from={s.startFrame} durationInFrames={s.endFrame - s.startFrame + 30} name={`voice ${s.id}`}>
          <Audio src={staticFile(s.audio!)} />
        </Sequence>
      ))}
      {MUSIC.map((m, i) => (
        <Sequence key={i} from={Math.round(m.from * FPS)} durationInFrames={Math.max(1, Math.round((m.to - m.from) * FPS))} name={`music ${m.theme}`}>
          <Audio src={staticFile(m.file)} volume={0.22} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
