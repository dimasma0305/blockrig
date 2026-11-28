// Debug compositions (open them in `npm run studio`, or render a still: npm run stills -- --comp Lineup):
//   Lineup        the whole cast side by side, turning, with names: check clothes, hair, faces, scale
//   PoseLab       the hero playing every clip in src/cast/clips.ts, 1.5 s each, with the clip's name
//   MaterialBoard every texture in src/kit/textures.ts as a swatch with its name
//   WeatherLab    the street cycling through every weather preset and time of day
//   PlanLab       the town's 2D plan (zones, lots, footprints) over the street from above (frame 0: all, 1: hero's block)
//   MapLab        each Roblox map (assets/roblox): orbit outside, then a look inside
// The Shot composition (Root.tsx) plays one shot of the real video with the debug overlay.
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { applyLook, LOOK, TEXTURES, texture, WEATHER, TIMES, createLighting, createWeather, applyFog, applyWetness, suburbanStreet, Materials, applyCamera, V } from "../kit";
import { buildCast } from "../cast/characters";
import { ALL } from "../cast/clips";
import { act, place } from "../direction/performance";
import { useRobloxCast, type RobloxCast } from "../cast/roblox";
import { useAssetLibrary, type AssetLibrary } from "../kit/assets";
import { buildRobloxMap } from "blockrig/video";
import { points as planPoints } from "../kit/plan";
import { buildWorld } from "../world/World";
import { ASSETS } from "../world/assets";

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
    applyLook(gl); scene.background = new THREE.Color(background);
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
    applyLook(gl);
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
  gl.toneMappingExposure = LOOK.exposure * time.exposure;
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

// ---------------------------------------------------------------- MapLab (Roblox maps)
// Each map in assets/roblox/cast.json in turn, MAP_SECONDS each: a slow orbit outside, then a look from inside,
// with the hero standing at the centre for scale. Use it to pick a map and find where to stand and point the camera.
export const MAP_SECONDS = 4;
function MapScene({ lib, rb }: { lib: AssetLibrary; rb: RobloxCast }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), { camera, gl, scene } = useThree() as any;
  const names = Object.keys(rb.maps).sort();
  const built = useMemo(() => {
    applyLook(gl);
    const lighting = createLighting({ shadowSize: 70 }); scene.add(lighting.root); lighting.update({ time: TIMES.day });
    scene.environment = lib.sky("day"); scene.environmentIntensity = 0.5;
    const maps = names.map((n) => { const m = buildRobloxMap(rb.maps[n].data, { ...rb.maps[n], pbr: (s) => lib.pbr(s) }); m.group.visible = false; scene.add(m.group); return m; });
    const cast = buildCast(rb); scene.add(cast.hero.rig.object);
    return { maps, cast, lighting };
  }, [gl, scene, lib, rb]);
  const t = frame / fps, i = Math.min(names.length - 1, Math.floor(t / MAP_SECONDS)), local = t - i * MAP_SECONDS;
  built.maps.forEach((m, k) => (m.group.visible = k === i));
  const box = built.maps[i].box, c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const floor = box.min.y + 0.5, r = Math.max(size.x, size.z) * 0.75 + 8;
  place(built.cast.hero, c.x, floor - 0.5 + 0.5, c.z); act(built.cast.hero, [], local, "happy");
  built.cast.hero.rig.object.position.y = floor;
  // outside: one full orbit (stills at quarter turns show every side, e.g. which way a house faces); inside: from one corner (15% in from the walls) across to the far one
  const outside = local < MAP_SECONDS * 0.5, a = (local / (MAP_SECONDS * 0.5)) * Math.PI * 2, k = local < MAP_SECONDS * 0.75 ? 1 : -1;
  const pos = outside ? V(c.x + Math.sin(a) * r, floor + size.y * 0.6 + 6, c.z + Math.cos(a) * r) : V(c.x + k * size.x * 0.35, floor + 5, c.z + k * size.z * 0.35);
  applyCamera(camera, { pos, target: outside ? V(c.x, floor + size.y * 0.25, c.z) : V(c.x - k * size.x * 0.3, floor + 3, c.z - k * size.z * 0.3), fov: outside ? 45 : 75, shake: 0 }, frame);
  return null;
}
export const MapLab: React.FC<{ roblox?: boolean }> = () => {
  const lib = useAssetLibrary(ASSETS), rb = useRobloxCast(true), frame = useCurrentFrame(), { fps } = useVideoConfig();
  const names = rb ? Object.keys(rb.maps).sort() : []; // sorted: maps load in any order
  return (
    <AbsoluteFill style={{ background: "#87a9d6" }}>
      {lib && rb && <Canvas><MapScene lib={lib} rb={rb} /></Canvas>}
      <div style={{ ...label, top: 160, left: 60 }}>{names[Math.min(names.length - 1, Math.floor(frame / fps / MAP_SECONDS))] ?? ""}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- PlanLab
// The town's 2D plan (src/kit/plan.ts) over the real 3D street, from above: grey road and sidewalks, yellow stage,
// beige paths, blue houses, purple Roblox lots, green trees, brown fences, orange cars. Overlaps print as errors.
function PlanScene({ lib, rb }: { lib: AssetLibrary; rb: RobloxCast | null }) {
  const frame = useCurrentFrame(), { camera, gl, scene } = useThree() as any;
  const world = useMemo(() => {
    applyLook(gl);
    const w = buildWorld(gl, scene, lib, rb), overlay = new THREE.Group();
    for (const it of w.plan.items) {
      const pts = planPoints(it.shape).map(([x, z]) => new THREE.Vector2(x, -z));
      const shape = new THREE.Shape(pts), y = it.kind === "area" ? 1 : it.kind === "zone" ? 1.5 : 2;
      const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: it.color ?? "#fff", transparent: true, opacity: it.kind === "area" ? 0.12 : 0.5, depthTest: false, side: THREE.DoubleSide }));
      fill.rotation.x = -Math.PI / 2; fill.position.y = y; fill.renderOrder = 10; overlay.add(fill);
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0))), new THREE.LineBasicMaterial({ color: it.color ?? "#fff", depthTest: false }));
      line.rotation.x = -Math.PI / 2; line.position.y = y + 0.1; line.renderOrder = 11; overlay.add(line);
    }
    scene.add(overlay);
    for (const c of w.plan.conflicts()) console.error(`plan: ${c}`);
    return w;
  }, [gl, scene, lib, rb]);
  // frame 0: the whole street; later frames: the hero's block
  const close = frame > 0, c = world.lawn;
  applyCamera(camera, { pos: close ? V(c.x + 10, 120, c.z + 1) : V(0, 330, 1), target: close ? V(c.x + 10, 0, c.z) : V(0, 0, 0), fov: 50, shake: 0 }, frame);
  world.update({ location: "street", weather: WEATHER.clear, daylight: TIMES.day, time: 0, local: 0, camera });
  scene.fog = null; // a plan is read from far above
  return null;
}
export const PlanLab: React.FC<{ roblox?: boolean }> = ({ roblox }) => {
  const lib = useAssetLibrary(ASSETS), rb = useRobloxCast(!!roblox);
  return <AbsoluteFill style={{ background: "#222" }}>{lib && rb !== undefined && <Canvas><PlanScene lib={lib} rb={rb} /></Canvas>}<div style={{ ...label, top: 160, left: 60 }}>plan{roblox ? " · roblox" : ""}</div></AbsoluteFill>;
};
