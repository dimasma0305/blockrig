// Debug compositions (open them in `npm run studio`, or render a still: npm run stills -- --comp Lineup):
//   Lineup        the whole cast side by side, turning, with names: check clothes, hair, faces, scale
//   PoseLab       the hero playing every clip in src/cast/clips.ts, 1.5 s each, with the clip's name
//   MaterialBoard every texture in src/kit/textures.ts as a swatch with its name
//   WeatherLab    the street cycling through every weather preset and time of day
// The Shot composition (Root.tsx) plays one shot of the real video with the debug overlay.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TEXTURES, texture, WEATHER, TIMES, createLighting, createWeather, applyFog, applyWetness, suburbanStreet, Materials, applyCamera, V } from "../kit";
import { buildCast } from "../cast/characters";
import { ALL } from "../cast/clips";
import { act, place } from "../direction/performance";
import { useRobloxCast, type RobloxCast } from "../cast/roblox";

const label: React.CSSProperties = { position: "absolute", color: "#fff", font: "800 44px sans-serif", WebkitTextStroke: "8px #000", paintOrder: "stroke fill" };
// a component (not a plain function) so it can be mounted only once its scene's data has loaded
function Canvas({ children }: { children: React.ReactNode }) {
  const { width, height } = useVideoConfig();
  return <ThreeCanvas width={width} height={height} shadows dpr={1} gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 4, 20] }}>{children}</ThreeCanvas>;
}
const canvas = (children: React.ReactNode) => <Canvas>{children}</Canvas>;
function useStage(background = "#2a3140") {
  const { gl, scene } = useThree() as any;
  return useMemo(() => {
    gl.toneMapping = THREE.AgXToneMapping; gl.shadowMap.type = THREE.PCFShadowMap; scene.background = new THREE.Color(background);
    const lighting = createLighting({ shadowSize: 20 }); scene.add(lighting.root); lighting.update({ time: TIMES.day });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: "#5d6577", roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    return lighting;
  }, [gl, scene]);
}

// ---------------------------------------------------------------- Lineup
function LineupScene({ rb }: { rb: RobloxCast | null }) {
  const frame = useCurrentFrame(), { camera } = useThree();
  useStage();
  const cast = useMemo(() => buildCast(rb), [rb]);
  const faces = ["neutral", "happy", "sad", "angry", "shocked", "smug"], face = faces[Math.floor(frame / 30) % faces.length];
  const n = cast.all.length;
  cast.all.forEach((q, i) => { place(q, (i - (n - 1) / 2) * 4.2, 0, Math.sin(frame / 40 + i) * 0.6); act(q, [], 0, face); }); // cycles the expressions every half second
  applyCamera(camera as THREE.PerspectiveCamera, { pos: V(0, 3.6, Math.max(26, n * 4.2 * 1.25) * 0.55), target: V(0, 3.2, 0), fov: 36, shake: 0 }, frame); // back off for big casts
  return <>{cast.all.map((q, i) => <primitive key={i} object={q.rig.object} />)}</>;
}
export const Lineup: React.FC<{ roblox?: boolean }> = ({ roblox }) => {
  const cast = useMemo(() => buildCast(), []), rb = useRobloxCast(!!roblox), frame = useCurrentFrame();
  const faces = ["neutral", "happy", "sad", "angry", "shocked", "smug"];
  return (
    <AbsoluteFill>
      {rb !== undefined && <Canvas><LineupScene rb={rb} /></Canvas>}
      <div style={{ ...label, top: 160, left: 60 }}>{faces[Math.floor(frame / 30) % faces.length]}</div>
      <div style={{ ...label, bottom: 120, left: 0, right: 0, display: "flex", justifyContent: "space-around", fontSize: 30 }}>{cast.all.map((q) => <span key={q.name}>{q.name}</span>)}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- PoseLab
export const POSE_SECONDS = 1.5;
function PoseScene() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), { camera } = useThree();
  useStage();
  const cast = useMemo(() => buildCast(), []);
  const names = Object.keys(ALL), t = frame / fps, i = Math.min(names.length - 1, Math.floor(t / POSE_SECONDS));
  place(cast.hero, 0, 0, 0.5); act(cast.hero, [{ clip: ALL[names[i]] }], t - i * POSE_SECONDS, "happy");
  applyCamera(camera as THREE.PerspectiveCamera, { pos: V(5, 4, 12), target: V(0, 2.8, 0), fov: 40, shake: 0 }, frame);
  return <primitive object={cast.hero.rig.object} />;
}
export const PoseLab: React.FC = () => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), names = Object.keys(ALL);
  return <AbsoluteFill>{canvas(<PoseScene />)}<div style={{ ...label, top: 160, left: 60 }}>{names[Math.min(names.length - 1, Math.floor(frame / fps / POSE_SECONDS))]}</div></AbsoluteFill>;
};

// ---------------------------------------------------------------- MaterialBoard
export const MaterialBoard: React.FC = () => {
  const names = Object.keys(TEXTURES);
  const urls = useMemo(() => names.map((n) => (texture(n).image as HTMLCanvasElement).toDataURL()), []);
  return (
    <AbsoluteFill style={{ background: "#1b1e26", padding: 50, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30, alignContent: "start" }}>
      {names.map((n, i) => (
        <div key={n} style={{ position: "relative" }}>
          <div style={{ width: "100%", aspectRatio: "1", backgroundImage: `url(${urls[i]})`, backgroundSize: "50%", borderRadius: 12 }} />
          <div style={{ ...label, position: "static", fontSize: 34, marginTop: 8 }}>{n} · {TEXTURES[n].studs} studs</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- WeatherLab
export const WEATHER_SECONDS = 2.5;
const PRESETS = Object.keys(WEATHER), PRESET_TIME: Record<string, keyof typeof TIMES> = { clear: "day", overcast: "day", fog: "dusk", drizzle: "golden", rain: "storm", storm: "storm", snow: "day", blizzard: "storm" };
function WeatherScene() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), { camera, gl, scene } = useThree() as any;
  const w = useMemo(() => {
    gl.toneMapping = THREE.AgXToneMapping; gl.shadowMap.type = THREE.PCFShadowMap;
    const M = new Materials(), town = suburbanStreet({ M, seed: 2, perSide: 4, length: 140 }), lighting = createLighting(), weather = createWeather();
    scene.add(town.root, lighting.root, weather.root);
    return { M, lighting, weather };
  }, [gl, scene]);
  const t = frame / fps, i = Math.min(PRESETS.length - 1, Math.floor(t / WEATHER_SECONDS)), name = PRESETS[i], local = t - i * WEATHER_SECONDS;
  applyCamera(camera, { pos: V(16, 7, -38), target: V(0, 3, 0), fov: 50, shake: 0 }, frame);
  camera.updateMatrixWorld(true);
  const weather = { ...WEATHER[name], lightning: name === "storm" ? [0.4, 1.4] : [] }, time = TIMES[PRESET_TIME[name]];
  const overcast = Math.min(1, weather.rain * 0.9 + weather.fog * 0.5 + weather.snow * 0.5);
  const { flash } = w.weather.update(weather, t, local, camera);
  w.lighting.update({ time, overcast, flash });
  gl.toneMappingExposure = time.exposure;
  applyFog(scene, weather, new THREE.Color(time.horizon).lerp(new THREE.Color("#7d8796"), overcast));
  for (const g of w.M.ground) applyWetness(g.mat, weather.wet, g.dry);
  w.M.setNight(Math.min(1, Math.max(0, 1 - time.sunIntensity / 2.2) + overcast * 0.3));
  return null;
}
export const WeatherLab: React.FC = () => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const i = Math.min(PRESETS.length - 1, Math.floor(frame / fps / WEATHER_SECONDS));
  return <AbsoluteFill>{canvas(<WeatherScene />)}<div style={{ ...label, top: 160, left: 60 }}>{PRESETS[i]} · {PRESET_TIME[PRESETS[i]]}</div></AbsoluteFill>;
};
export const WEATHER_PRESET_COUNT = PRESETS.length;
