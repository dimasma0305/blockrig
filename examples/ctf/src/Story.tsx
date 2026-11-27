// The composition: a ThreeCanvas with the world, the cast and the camera; glitch cuts and a scanline overlay;
// narration and music; captions.
import { useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildCast } from "./characters";
import { buildWorld } from "./World";
import { perform } from "./performance";
import { cameraFor, applyCamera } from "./camera";
import { Captions } from "./Captions";
import { SHOTS, MUSIC, shotAt, FPS } from "./timeline";
import { rng } from "./lib/rng";

function Scene() {
  const frame = useCurrentFrame(), time = frame / FPS;
  const { camera, gl, scene } = useThree() as any;
  // straight to the canvas with AgX tone mapping and soft shadows (an EffectComposer blanks Remotion's frames)
  const world = useMemo(() => { gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1.25; gl.shadowMap.type = THREE.PCFSoftShadowMap; return buildWorld(gl, scene); }, [gl, scene]);
  const cast = useMemo(() => buildCast(), []);
  const { shot, local, p } = shotAt(time);
  const { state, focus } = perform(shot, local, p, time, cast);
  for (const q of cast.all) q.rig.object.updateMatrixWorld(true);
  const cam = cameraFor(shot, p, local, cast);
  applyCamera(camera, cam, time);
  world.update(state, time, focus);
  return (
    <>
      <primitive object={world.root} />
      {cast.all.map((q, i) => <primitive key={i} object={q.rig.object} />)}
    </>
  );
}

// a short RGB-split glitch with sliding bars on the cuts that land a beat
const GLITCH_ON = new Set(["s05", "s07", "s10", "s12"]);
function GlitchCut() {
  const frame = useCurrentFrame();
  const hit = SHOTS.find((s) => GLITCH_ON.has(s.id) && frame >= s.startFrame && frame < s.startFrame + 9);
  if (!hit) return null;
  const k = frame - hit.startFrame, r = rng(hit.startFrame * 31 + k), fade = 1 - k / 9;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${r() * 100}%`, height: `${2 + r() * 7}%`, transform: `translateX(${(r() - 0.5) * 30}%)`,
          background: i % 2 ? `rgba(255,46,136,${0.55 * fade})` : `rgba(25,227,196,${0.55 * fade})` }} />
      ))}
      <AbsoluteFill style={{ background: `rgba(255,255,255,${0.35 * fade * (k < 2 ? 1 : 0)})` }} />
    </AbsoluteFill>
  );
}

export const Story: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#060a1e" }}>
      <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }}
        camera={{ fov: 50, near: 0.05, far: 1200, position: [0, 10, 30] }}>
        <Scene />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,12,0.55) 100%)", pointerEvents: "none" }} />
      <GlitchCut />
      <Captions />
      {SHOTS.filter((s) => s.audio).map((s) => (
        <Sequence key={s.id} from={s.startFrame} durationInFrames={s.endFrame - s.startFrame + 30} name={`voice ${s.id}`}>
          <Audio src={staticFile(s.audio!)} />
        </Sequence>
      ))}
      {MUSIC.map((m, i) => (
        <Sequence key={i} from={Math.round(m.from * FPS)} durationInFrames={Math.max(1, Math.round((m.to - m.from) * FPS))} name={`music ${m.theme}`}>
          <Audio src={staticFile(m.file)} volume={0.2} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
