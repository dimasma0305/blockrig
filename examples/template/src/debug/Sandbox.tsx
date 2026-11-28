// Sandbox: one character on a small lit stage, to see a change quickly (a face, hair, clothes, a clip, the light,
// shadows, effects) without rendering a video. In Studio (npm run studio → Debug → Sandbox) drag to orbit, scroll
// to zoom, and edit the props on the right; rendered (npm run stills -- --comp Sandbox 0 120 240), the camera turns
// slowly around the character, so frames show every side.
//
// Props: who (hero, sister, neighbour0..3), clip (a name from src/cast/clips.ts, "all" to cycle them, or a pack's slot
// as "<pack>:<slot>", e.g. "rthro:run" after npm run pack -- bundle:356 rthro), face (an
// expression, or "cycle"), time (day, golden, dusk, night), post (effects on/off), ao, bloom.
import { useEffect, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, getRemotionEnvironment } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { applyLook, LOOK, TIMES, createLighting, useAssetLibrary, layer, type AssetLibrary } from "../kit";
import { usePost, POST_DEFAULTS } from "../kit/post";
import { LightRig, LIGHT_PRESETS } from "../kit/lightRig";
import { ASSETS } from "../world/assets";
import { buildCast, HAIR } from "../cast/characters";
import { ALL } from "../cast/clips";
import { act, place } from "../direction/performance";
import { useRobloxCast, type RobloxCast } from "../cast/roblox";
import { usePacks, type Packs } from "../cast/packs";

export type SandboxProps = { who: string; clip: string; face: string; hair: string; spin: number; time: string; light: string; soft: boolean; post: boolean; ao: number; bloom: number; roblox: boolean };
export const SANDBOX_DEFAULTS: SandboxProps = { who: "hero", clip: "all", face: "cycle", hair: "own", spin: 0.5, time: "day", light: "golden", soft: true, post: true, ao: POST_DEFAULTS.ao, bloom: POST_DEFAULTS.bloom, roblox: true };
const FACES = ["neutral", "happy", "laugh", "smug", "determined", "angry", "furious", "shocked", "scared", "sad", "embarrassed", "sleepy", "dazed"];
const ALL_HAIR = [...HAIR.boy, ...HAIR.girl];
export const CLIP_SECONDS = 2.5;

function Stage({ lib, rb, packs, p }: { lib: AssetLibrary; rb: RobloxCast | null; packs: Packs; p: SandboxProps }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), t = frame / fps;
  const { gl, scene, camera } = useThree() as any;
  const studio = getRemotionEnvironment().isStudio;
  const built = useMemo(() => {
    applyLook(gl);
    const root = new THREE.Group(); scene.add(root);
    const ground = layer(new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lib.pbr("grass", { repeat: [400 / 6, 400 / 6] })), 0); ground.rotation.x = -Math.PI / 2; root.add(ground);
    const path = layer(new THREE.Mesh(new THREE.PlaneGeometry(6, 60), lib.pbr("concrete", { repeat: [6 / 4, 60 / 4] })), 1); path.rotation.x = -Math.PI / 2; path.position.z = -10; root.add(path);
    // a few things for scale and for shadows to fall on
    const at = (o: THREE.Object3D, x: number, z: number, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; root.add(o); return o; };
    at(lib.model("treeLarge", { height: 22 }), -14, -16); at(lib.model("treeSmall", { height: 12 }), 12, -20);
    at(lib.model("planter", { height: 2.4 }), 10, -12); at(lib.model("streetLight", { height: 14 }), -15, -9, Math.PI / 2); // all outside the 11-stud camera turn
    for (let i = -3; i <= 3; i++) at(lib.model("fence", { width: 4.4 }), i * 4.6, -26);
    const lighting = createLighting({ shadowSize: 30, sky: false }); root.add(lighting.root);
    const cast = buildCast(rb), all = [cast.hero, ...(cast as any).sister ? [(cast as any).sister] : [], ...((cast as any).neighbours ?? [])];
    // every Roblox hair in the manifest on every character, hidden: the `hair` prop shows one (or "own")
    const hairs = new Map<any, { own: THREE.Object3D[]; pool: Record<string, THREE.Object3D> }>();
    for (const q of all) {
      root.add(q.rig.object); q.rig.object.visible = false;
      const own = (q.rig.accessories as THREE.Object3D[]).filter((m) => m.name === "HairAttachment" || m.name === "HatAttachment"), pool: Record<string, THREE.Object3D> = {};
      for (const k of ALL_HAIR) { const h = rb?.hair[k]; if (!h) continue; const m = q.rig.addAccessory(h.mesh, { attachment: h.attachment, map: h.map, scale: h.scale, offset: h.offset }); m.visible = false; pool[k] = m; }
      hairs.set(q, { own, pool });
    }
    return { lighting, cast, all, hairs };
  }, [gl, scene, lib, rb]);

  const who = built.all.find((q: any) => q.name === p.who) ?? built.cast.hero;
  for (const q of built.all) q.rig.object.visible = q === who;
  const hs = built.hairs.get(who), keys = Object.keys(hs?.pool ?? {});
  const hairKey = p.hair === "cycle" ? keys[Math.floor(t / 2) % Math.max(1, keys.length)] : p.hair;
  if (hs) { for (const o of hs.own) o.visible = !hs.pool[hairKey]; for (const [k, o] of Object.entries(hs.pool)) o.visible = k === hairKey; }
  const names = Object.keys(ALL), ci = p.clip === "all" ? Math.floor(t / CLIP_SECONDS) % names.length : Math.max(0, names.indexOf(p.clip));
  const face = p.face === "cycle" ? FACES[Math.floor(t / 1.2) % FACES.length] : p.face;
  // "<pack>:<slot>": the heaviest clip of that slot in a Roblox pack (src/cast/packs.ts)
  const [packName, slot] = p.clip.split(":"), packClip = slot ? packs[packName]?.clip(slot) : null;
  place(who, 0, 0, 0); act(who, [{ clip: packClip ?? (ALL as any)[names[ci]] }], p.clip === "all" ? t % CLIP_SECONDS : t, face);
  // light: "hdri" = the sky photo lights the scene (as before); a preset = drei Lightformers + PCSS soft shadows (kit/lightRig.tsx)
  const preset = LIGHT_PRESETS[p.light], day = TIMES[preset ? preset.time : p.time] ?? TIMES.day;
  built.lighting.update({ time: day, focus: new THREE.Vector3() });
  const sky = day.stars > 0.6 ? "night" : day.sunDir[1] < 0.5 ? "golden" : "day";
  scene.background = lib.sky(sky); scene.backgroundIntensity = day.stars > 0.6 ? 0.3 : 1;
  if (!preset) { scene.environment = lib.sky(sky); scene.environmentIntensity = day.stars > 0.6 ? 0.3 : 1; }
  gl.toneMappingExposure = LOOK.exposure * day.exposure;

  // the camera: orbit by hand in Studio; when rendered, a slow turn around the character
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    if (!studio) return;
    const c = new OrbitControls(camera, gl.domElement); c.target.set(0, 2.6, 0); c.enableDamping = true; c.minDistance = 3; c.maxDistance = 60;
    camera.position.set(4, 4, -11); c.update(); controls.current = c;
    return () => c.dispose();
  }, [studio, camera, gl]);
  // rendered: starts in front (characters face +Z) and turns
  if (!studio) { const a = t * p.spin; camera.position.set(Math.sin(a) * 11, 4.2, Math.cos(a) * 11); camera.lookAt(0, 2.6, 0); }
  camera.near = 0.3; camera.far = 2000; camera.updateProjectionMatrix();
  useFrame(() => controls.current?.update(), 0);
  const post = usePost({ ...POST_DEFAULTS, ao: p.ao, bloom: p.bloom }, p.post);
  post?.set({ ao: p.ao, bloom: p.bloom });
  return preset ? <LightRig key={p.light + String(p.soft)} preset={p.light} softShadows={p.soft} /> : null;
}

export const Sandbox: React.FC<Partial<SandboxProps>> = (props) => {
  const p = { ...SANDBOX_DEFAULTS, ...props };
  const { width, height } = useVideoConfig();
  const lib = useAssetLibrary(ASSETS), rb = useRobloxCast(!!p.roblox), packs = usePacks();
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), names = Object.keys(ALL);
  const label: React.CSSProperties = { position: "absolute", left: 50, color: "#fff", font: "800 40px sans-serif", WebkitTextStroke: "7px #000", paintOrder: "stroke fill" };
  const ci = p.clip === "all" ? Math.floor(frame / fps / CLIP_SECONDS) % names.length : Math.max(0, names.indexOf(p.clip));
  const face = p.face === "cycle" ? FACES[Math.floor(frame / fps / 1.2) % FACES.length] : p.face;
  return (
    <AbsoluteFill style={{ background: "#87a9d6" }}>
      {lib && rb !== undefined && packs && <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: !p.post, outputColorSpace: THREE.SRGBColorSpace, preserveDrawingBuffer: true }} camera={{ fov: 45, position: [4, 4, -11] }}>
        <Stage lib={lib} rb={rb} packs={packs} p={p} />
      </ThreeCanvas>}
      <div style={{ ...label, top: 120 }}>{p.who} · {p.clip.includes(":") ? p.clip : names[ci]} · {face}{p.hair !== "own" ? ` · ${p.hair === "cycle" ? ALL_HAIR[Math.floor(frame / fps / 2) % ALL_HAIR.length] : p.hair}` : ""}</div>
      <div style={{ ...label, top: 175, fontSize: 28, WebkitTextStroke: "5px #000" }}>{LIGHT_PRESETS[p.light] ? `light: ${p.light}` : `${p.time} (sky light)`} · effects {p.post ? `on (AO ${p.ao}, bloom ${p.bloom})` : "off"}</div>
    </AbsoluteFill>
  );
};
