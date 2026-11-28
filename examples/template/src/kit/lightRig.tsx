// Lighting presets built with drei: the image-based light (what reflects and fills the shade) is made of simple
// glowing shapes, <Lightformer>s, rendered once into an environment map, instead of a fixed HDRI photo; plus
// contact-hardening soft shadows (PCSS: sharp where a foot touches the ground, softer further away). A preset also
// names the sun (a TIMES entry, blockrig/video lighting) so the key light, shadows and the fill agree.
//
//   <LightRig preset="golden" />          inside the ThreeCanvas tree; key={preset} remounts it on a change
//   LIGHT_PRESETS.golden.time             the TIMES entry its sun uses (pass it to createLighting().update)
//
// Frame-pure: the environment renders once when it mounts (frames={1}), and the PCSS noise depends only on the pixel.
import { Environment, Lightformer, SoftShadows } from "@react-three/drei";
import { LOOK } from "blockrig/video";

type Former = { form?: "rect" | "circle" | "ring"; color: string; intensity: number; position: [number, number, number]; scale: [number, number]; rotation?: [number, number, number] };
export type LightPreset = {
  /** what it is for */
  about: string;
  /** the sun / moon (key light) and exposure: a TIMES entry */
  time: "day" | "golden" | "dusk" | "night" | "storm";
  /** the environment's base colour (the light that comes from everywhere) and how strong the environment is */
  base: string; envIntensity: number;
  /** glowing shapes around the scene, in a 20-stud room around the camera's focus (y up, the camera on +z) */
  formers: Former[];
  /** PCSS soft shadows: penumbra size, samples, focus (0 = soft everywhere, 1 = contact-sharp) */
  shadows: { size: number; samples: number; focus: number };
};

export const LIGHT_PRESETS: Record<string, LightPreset> = {
  day: {
    about: "bright Roblox afternoon: white sky softbox overhead, blue sky fill, warm bounce from the ground",
    time: "day", base: "#6f8db8", envIntensity: 1,
    formers: [
      { form: "rect", color: "#ffffff", intensity: 3, position: [0, 10, 0], scale: [24, 24], rotation: [Math.PI / 2, 0, 0] },
      { form: "rect", color: "#9cc4ff", intensity: 1.2, position: [-12, 4, 6], scale: [10, 8] },
      { form: "rect", color: "#d9c39a", intensity: 0.6, position: [0, -6, 0], scale: [24, 24], rotation: [-Math.PI / 2, 0, 0] },
    ],
    shadows: { size: 18, samples: 16, focus: 0.6 },
  },
  golden: {
    about: "late afternoon: a low warm sun strip, a cool blue sky on the shadow side, a warm rim",
    time: "golden", base: "#5c4a52", envIntensity: 1.15,
    formers: [
      { form: "rect", color: "#ffb36b", intensity: 8, position: [12, 2.5, -4], scale: [16, 4] },
      { form: "rect", color: "#8fb0ff", intensity: 0.7, position: [-12, 6, 6], scale: [12, 8] },
      { form: "circle", color: "#ffd2a1", intensity: 2.5, position: [0, 6, -12], scale: [5, 5] },
    ],
    shadows: { size: 28, samples: 16, focus: 0.5 },
  },
  night: {
    about: "night with fire: a dark blue moonlit top, a cool moon rim, orange firelight from low on one side",
    time: "night", base: "#0b1024", envIntensity: 0.9,
    formers: [
      { form: "rect", color: "#6f86c9", intensity: 0.8, position: [0, 10, 0], scale: [24, 24], rotation: [Math.PI / 2, 0, 0] },
      { form: "rect", color: "#ff7a2a", intensity: 5, position: [10, 1.5, 4], scale: [10, 3] },
      { form: "circle", color: "#b8c8ff", intensity: 2, position: [-8, 9, -10], scale: [3, 3] },
    ],
    shadows: { size: 12, samples: 16, focus: 0.7 },
  },
  indoor: {
    about: "a room: a warm softbox in the ceiling, a cool window on one side, dark walls",
    time: "dusk", base: "#1a1410", envIntensity: 1,
    formers: [
      { form: "rect", color: "#ffe2b8", intensity: 4, position: [0, 9, 0], scale: [10, 10], rotation: [Math.PI / 2, 0, 0] },
      { form: "rect", color: "#a9c6ff", intensity: 2.2, position: [-10, 4, 0], scale: [6, 7], rotation: [0, Math.PI / 2, 0] },
      { form: "rect", color: "#ffb070", intensity: 1, position: [8, 3, 6], scale: [4, 4] },
    ],
    shadows: { size: 10, samples: 16, focus: 0.8 },
  },
  studio: {
    about: "close-ups: a three-point portrait setup, a big soft key, a dim fill, a bright rim behind",
    time: "day", base: "#1c2230", envIntensity: 1.2,
    formers: [
      { form: "rect", color: "#ffffff", intensity: 5, position: [6, 5, 8], scale: [8, 8] },
      { form: "rect", color: "#c9d8ff", intensity: 1.2, position: [-8, 3, 6], scale: [6, 6] },
      { form: "rect", color: "#ffffff", intensity: 6, position: [0, 6, -10], scale: [10, 2] },
    ],
    shadows: { size: 14, samples: 16, focus: 0.7 },
  },
};
export const LIGHT_PRESET_NAMES = Object.keys(LIGHT_PRESETS);

/** The preset's image-based light and soft shadows. Mount it before the scene's materials compile (PCSS patches the shadow shader). */
export function LightRig({ preset, softShadows = true }: { preset: string; softShadows?: boolean }) {
  const p = LIGHT_PRESETS[preset];
  if (!p) return null;
  return (
    <>
      {softShadows && <SoftShadows size={p.shadows.size} samples={p.shadows.samples} focus={p.shadows.focus} />}
      <Environment frames={1} resolution={256} background={false} environmentIntensity={p.envIntensity * LOOK.env}>
        <color attach="background" args={[p.base]} />
        {p.formers.map((f, i) => <Lightformer key={i} form={f.form ?? "rect"} color={f.color} intensity={f.intensity} position={f.position} scale={f.scale as any} {...(f.rotation ? { rotation: f.rotation } : {})} />)} {/* no rotation: it faces the centre */}
      </Environment>
    </>
  );
}
