// Roblox dynamic heads: the FACS block of a head mesh and the FaceControls that drive it.
//
// A dynamic head is a skinned MeshPart whose face bones carry, for each FACS control, the offset that bone
// takes at full strength. FaceControls has one property per control (0..1); the head's pose is the sum of
// every control's offsets times its value, plus corrective poses for pairs and triples of controls whose
// weight is the product of their controls' values. Layout of the mesh's FACS data (v5 header block or v6/v7
// "FACS" chunk), as read here:
//   u32 boneNamesSize, u32 controlNamesSize, u64 transformsSize, u32 twoPoseSize, u32 threePoseSize
//   boneNames (NUL-separated), controlNames (NUL-separated)
//   six QuantizedMatrix: px, py, pz, rx, ry, rz -- rows = face bones, cols = controls + 2-pose + 3-pose
//     u16 version, u32 rows, u32 cols; v1: f32[rows*cols]; v2: f32 min, f32 max, u16[rows*cols]
//   twoPose: u16 pairs, threePose: u16 triples (control indices)

/** FACS control codes in head meshes -> FaceControls property names. */
export const FACS_CODES = {
  c_COR: "Corrugator", c_CR: "ChinRaiser", c_CRUL: "ChinRaiserUpperLip", c_ELD: "EyesLookDown", c_ELL: "EyesLookLeft",
  c_ELR: "EyesLookRight", c_ELU: "EyesLookUp", c_FN: "Funneler", c_FP: "FlatPucker", c_JD: "JawDrop", c_JL: "JawLeft",
  c_JR: "JawRight", c_LLS: "LowerLipSuck", c_LP: "LipPresser", c_LPT: "LipsTogether", c_ML: "MouthLeft", c_MR: "MouthRight",
  c_PK: "Pucker", c_TD: "TongueDown", c_TO: "TongueOut", c_TU: "TongueUp", c_ULS: "UpperLipSuck",
};
for (const [s, side] of [["l", "Left"], ["r", "Right"]]) Object.assign(FACS_CODES, {
  [`${s}_BL`]: `${side}BrowLowerer`, [`${s}_CHP`]: `${side}CheekPuff`, [`${s}_CHR`]: `${side}CheekRaiser`, [`${s}_DM`]: `${side}Dimpler`,
  [`${s}_EC`]: `${side}EyeClosed`, [`${s}_EULR`]: `${side}EyeUpperLidRaiser`, [`${s}_IBR`]: `${side}InnerBrowRaiser`,
  [`${s}_LCD`]: `${side}LipCornerDown`, [`${s}_LCP`]: `${side}LipCornerPuller`, [`${s}_LLD`]: `${side}LowerLipDepressor`,
  [`${s}_LS`]: `${side}LipStretcher`, [`${s}_NW`]: `${side}NoseWrinkler`, [`${s}_OBR`]: `${side}OuterBrowRaiser`, [`${s}_ULR`]: `${side}UpperLipRaiser`,
});
/** The 50 FaceControls properties. */
export const FACE_CONTROLS = Object.values(FACS_CODES);

/**
 * Parse a head mesh's FACS bytes (ParsedMesh.facs).
 * @returns {{ bones: string[], controls: string[], codes: string[], twoPose: number[][], threePose: number[][],
 *            rows: number, cols: number, px: Float32Array, py: Float32Array, pz: Float32Array,
 *            rx: Float32Array, ry: Float32Array, rz: Float32Array }}
 *   `controls` are FaceControls names (codes this table doesn't know are kept as they are); matrices are
 *   row-major [bone * cols + column], studs for p and as stored for r.
 */
export function parseFacs(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let o = 0;
  const u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; }, u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const f32 = () => { const v = dv.getFloat32(o, true); o += 4; return v; };
  const names = (n) => { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(u8[o + i]); o += n; return s.split("\0").filter(Boolean); };
  const nBones = u32(), nCtrl = u32(); u32(); u32(); const n2 = u32(), n3 = u32();
  const bones = names(nBones), codes = names(nCtrl), out = { bones, codes, controls: codes.map((c) => FACS_CODES[c] || c) };
  for (const k of ["px", "py", "pz", "rx", "ry", "rz"]) {
    const ver = u16(), rows = u32(), cols = u32(), a = new Float32Array(rows * cols);
    if (ver === 1) for (let i = 0; i < a.length; i++) a[i] = f32();
    else if (ver === 2) { const mn = f32(), mx = f32(), k2 = (mx - mn) / 65535; for (let i = 0; i < a.length; i++) a[i] = mn + u16() * k2; }
    else throw new Error(`blockrig: FACS matrix version ${ver} not supported`);
    out[k] = a; out.rows = rows; out.cols = cols;
  }
  out.twoPose = []; for (let i = 0; i < n2 / 4; i++) out.twoPose.push([u16(), u16()]);
  out.threePose = []; for (let i = 0; i < n3 / 6; i++) out.threePose.push([u16(), u16(), u16()]);
  if (out.cols !== codes.length + out.twoPose.length + out.threePose.length) throw new Error(`blockrig: FACS has ${out.cols} columns for ${codes.length} controls and ${out.twoPose.length + out.threePose.length} correctives`);
  return out;
}

/**
 * Column weights for a set of FaceControls values: each control's value (clamped to 0..1), then each
 * corrective's product of its controls' values.
 */
export function facsWeights(facs, values) {
  const w = new Float32Array(facs.cols), n = facs.controls.length;
  for (let c = 0; c < n; c++) { const v = values[facs.controls[c]]; w[c] = v > 0 ? Math.min(1, v) : 0; }
  facs.twoPose.forEach(([a, b], i) => { w[n + i] = w[a] * w[b]; });
  facs.threePose.forEach(([a, b, c], i) => { w[n + facs.twoPose.length + i] = w[a] * w[b] * w[c]; });
  return w;
}

/** Offset of every face bone for these FaceControls values: Float32Array [x, y, z] per FACS bone (studs). */
export function facsBoneOffsets(facs, values, out = new Float32Array(facs.rows * 3)) {
  const w = facsWeights(facs, values), { rows, cols, px, py, pz } = facs;
  out.fill(0);
  for (let c = 0; c < cols; c++) {
    const k = w[c]; if (!k) continue;
    for (let r = 0; r < rows; r++) { const i = r * cols + c; out[r * 3] += k * px[i]; out[r * 3 + 1] += k * py[i]; out[r * 3 + 2] += k * pz[i]; }
  }
  return out;
}

// ---- expressions as FaceControls, for dynamic heads ----
// Named sets of FaceControls values (a BlockRig convenience: Roblox has the controls, not the names), so a story can
// say "sad". Values follow FACS: a smile is LipCornerPuller + CheekRaiser, sadness is InnerBrowRaiser +
// LipCornerDown, surprise is brows up + UpperLidRaiser + JawDrop, anger is BrowLowerer + Corrugator + LipPresser.
const both = (name, v) => ({ [`Left${name}`]: v, [`Right${name}`]: v });
export const FACS_EXPRESSIONS = {
  neutral: {},
  happy: { ...both("LipCornerPuller", 0.7), ...both("CheekRaiser", 0.35) },
  grin: { ...both("LipCornerPuller", 1), ...both("CheekRaiser", 0.6), ...both("LipStretcher", 0.3), JawDrop: 0.15 },
  laugh: { ...both("LipCornerPuller", 1), ...both("CheekRaiser", 0.8), ...both("EyeClosed", 0.6), JawDrop: 0.5 },
  smug: { RightLipCornerPuller: 0.8, RightCheekRaiser: 0.3, ...both("EyeClosed", 0.25), ...both("BrowLowerer", 0.2), EyesLookRight: 0.2 },
  wink: { ...both("LipCornerPuller", 0.7), LeftEyeClosed: 1, LeftCheekRaiser: 0.5 },
  determined: { ...both("BrowLowerer", 0.6), Corrugator: 0.3, LipPresser: 0.5, ChinRaiser: 0.3 },
  angry: { ...both("BrowLowerer", 1), Corrugator: 1, LipPresser: 0.7, ...both("NoseWrinkler", 0.5), ...both("UpperLipRaiser", 0.2) },
  furious: { ...both("BrowLowerer", 1), Corrugator: 1, ...both("NoseWrinkler", 0.8), ...both("UpperLipRaiser", 0.6), ...both("LipStretcher", 0.6), JawDrop: 0.25 },
  roar: { ...both("BrowLowerer", 1), Corrugator: 1, ...both("NoseWrinkler", 1), ...both("UpperLipRaiser", 0.8), JawDrop: 0.9 },
  shocked: { ...both("InnerBrowRaiser", 1), ...both("OuterBrowRaiser", 1), ...both("EyeUpperLidRaiser", 0.9), JawDrop: 0.7, Funneler: 0.2 },
  scared: { ...both("InnerBrowRaiser", 1), ...both("OuterBrowRaiser", 0.4), ...both("EyeUpperLidRaiser", 0.8), ...both("LipStretcher", 0.7), Corrugator: 0.3, JawDrop: 0.2 },
  sad: { ...both("InnerBrowRaiser", 0.9), Corrugator: 0.4, ...both("LipCornerDown", 0.8), ChinRaiser: 0.4, EyesLookDown: 0.3, ...both("EyeClosed", 0.15) },
  hurt: { ...both("InnerBrowRaiser", 0.8), Corrugator: 0.6, ...both("EyeClosed", 0.5), ...both("LipStretcher", 0.5), ...both("LipCornerDown", 0.4) },
  sleepy: { ...both("EyeClosed", 0.75), ...both("InnerBrowRaiser", 0.2), JawDrop: 0.1 },
  embarrassed: { ...both("LipCornerPuller", 0.35), ...both("InnerBrowRaiser", 0.5), EyesLookDown: 0.6, EyesLookLeft: 0.3, LipPresser: 0.3 },
  dazed: { ...both("EyeClosed", 0.35), EyesLookUp: 0.3, EyesLookLeft: 0.2, JawDrop: 0.3, ...both("InnerBrowRaiser", 0.3) },
};
/** FaceControls values for an expression name (0 for every control it doesn't use). Unknown names give neutral. */
export function facsExpression(name, amount = 1) {
  const out = Object.fromEntries(FACE_CONTROLS.map((c) => [c, 0]));
  for (const [c, v] of Object.entries(FACS_EXPRESSIONS[name] ?? {})) out[c] = Math.min(1, v * amount);
  return out;
}
