// Procedural layered clothing: builds a skinned long coat on the R15 bind pose, in the same shape
// parseMesh() returns. It is entirely generated here (no Roblox assets) and is used for tests and demos.
import { R15_BIND, R15_NECK_Y } from "./skeleton.js";

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * @param {{ slices?: number, length?: number, puff?: number, tails?: boolean }} [o]
 *   slices: vertical subdivisions per segment; length: how far the coat tails reach (studs below the hip)
 */
export function makeCoat(o = {}) {
  const { slices = 6, length = 1.5, puff = 0.08, tails = true } = o;
  const bones = R15_BIND.map((b, i) => ({ name: b.name, parent: b.parent == null ? -1 : R15_BIND.findIndex((x) => x.name === b.parent), lodParent: -1, culling: 0, cframe: { rot: b.rot.slice(), pos: b.pos.slice() } }));
  const B = Object.fromEntries(bones.map((b, i) => [b.name, i]));
  const y = (n) => R15_BIND[B[n]].pos[1];
  const P = [], N = [], U = [], SI = [], SW = [], I = [];

  // a vertex with up to 4 bone weights
  function vert(p, n, uv, w) {
    const e = Object.entries(w).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = e.reduce((a, [, v]) => a + v, 0);
    P.push(...p); N.push(...n); U.push(...uv);
    for (let k = 0; k < 4; k++) { SI.push(e[k] ? B[e[k][0]] : 0); SW.push(e[k] ? e[k][1] / sum : 0); }
    return P.length / 3 - 1;
  }
  // an open box tube from yTop down to yBot, with a weight function of height (and x)
  function tube(cx, cz, w, d, yTop, yBot, weights, { capTop = false, u0 = 0, u1 = 1 } = {}) {
    const hw = w / 2 + puff, hd = d / 2 + puff, rows = Math.max(1, Math.round(((yTop - yBot) / 0.25) * (slices / 6)));
    const sides = [ // [corner A, corner B, normal]
      [[-hw, -hd], [hw, -hd], [0, 0, -1]], [[hw, -hd], [hw, hd], [1, 0, 0]], [[hw, hd], [-hw, hd], [0, 0, 1]], [[-hw, hd], [-hw, -hd], [-1, 0, 0]],
    ];
    sides.forEach(([a, b, n], si) => {
      const base = P.length / 3;
      for (let r = 0; r <= rows; r++) {
        const yy = yTop - ((yTop - yBot) * r) / rows;
        for (const [c, uu] of [[a, 0], [b, 1]]) {
          const x = cx + c[0], z = cz + c[1];
          vert([x, yy, z], n, [u0 + (u1 - u0) * ((si + uu) / 4), r / rows], weights(yy, x));
        }
      }
      // counter-clockwise when seen from outside, so front faces point along the side's normal
      for (let r = 0; r < rows; r++) { const i0 = base + r * 2; I.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2); }
    });
    if (capTop) {
      const w0 = weights(yTop, cx), c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => vert([cx + x, yTop, cz + z], [0, 1, 0], [0.5, 0], w0));
      I.push(c[0], c[2], c[1], c[0], c[3], c[2]);
    }
  }

  const waist = y("UpperTorso"), hip = y("LowerTorso");
  // body of the coat: UpperTorso above the waist, LowerTorso below, blended across the waist
  tube(0, 0, 2, 1, R15_NECK_Y, hip - 0.1, (yy) => { const t = smooth(waist - 0.2, waist + 0.2, yy); return { UpperTorso: t, LowerTorso: 1 - t }; }, { capTop: true, u0: 0, u1: 0.5 });
  // sleeves: upper arm -> lower arm, blended across the elbow; cuff ends just above the hand
  for (const side of ["Left", "Right"]) {
    const s = side === "Left" ? -1 : 1, el = y(side + "LowerArm"), wr = y(side + "Hand");
    tube(1.5 * s, 0, 1, 1, R15_NECK_Y, wr + 0.05, (yy) => { const t = smooth(el - 0.2, el + 0.2, yy); return { [side + "UpperArm"]: t, [side + "LowerArm"]: 1 - t, ...(yy > R15_NECK_Y - 0.25 ? { UpperTorso: 0.35 } : {}) }; }, { capTop: true, u0: 0.5, u1: 0.75 });
    // coat tails: hang from the hip and follow the leg on their side
    if (tails) {
      const kn = y(side + "LowerLeg");
      tube(0.5 * s, 0, 1, 1, hip - 0.05, hip - length, (yy) => {
        const lt = smooth(hip - 0.35, hip, yy), kt = smooth(kn + 0.15, kn - 0.25, yy);
        return { LowerTorso: lt * 0.8, [side + "UpperLeg"]: (1 - lt) * (1 - kt) + lt * 0.2, [side + "LowerLeg"]: (1 - lt) * kt };
      }, { u0: 0.75, u1: 1 });
    }
  }

  const positions = new Float32Array(P), indices = new Uint32Array(I);
  return {
    version: "generated", vertexCount: P.length / 3, faceCount: I.length / 3,
    positions, normals: new Float32Array(N), uvs: new Float32Array(U), colors: null, indices,
    lods: [0, I.length / 3], bones, skinIndex: new Uint16Array(SI), skinWeight: new Float32Array(SW),
    subsets: [{ facesBegin: 0, facesLength: I.length / 3, vertsBegin: 0, vertsLength: P.length / 3, boneIndices: bones.map((_, i) => i) }], facs: null,
  };
}
