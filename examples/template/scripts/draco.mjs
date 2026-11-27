// decodeDraco hook for parseMesh in Node (Google draco3d, Apache-2.0): Roblox mesh v7 files are Draco-compressed.
import draco3d from "draco3d";
const M = await draco3d.createDecoderModule({});
export function decodeDraco(bytes) {
  const dec = new M.Decoder(), buf = new M.DecoderBuffer(); buf.Init(bytes, bytes.length);
  const mesh = new M.Mesh(), st = dec.DecodeBufferToMesh(buf, mesh);
  if (!st.ok()) throw new Error("draco: " + st.error_msg());
  const n = mesh.num_points(), out = {};
  const attr = (type, comps, key) => {
    const id = dec.GetAttributeId(mesh, M[type]); if (id < 0) return;
    const a = dec.GetAttribute(mesh, id), arr = new M.DracoFloat32Array(); dec.GetAttributeFloatForAllPoints(mesh, a, arr);
    const f = new Float32Array(n * comps); for (let i = 0; i < f.length; i++) f[i] = arr.GetValue(i); M.destroy(arr); out[key] = f;
  };
  attr("POSITION", 3, "positions"); attr("NORMAL", 3, "normals"); attr("TEX_COORD", 2, "uvs");
  const nf = mesh.num_faces(), idx = new Uint32Array(nf * 3), fa = new M.DracoInt32Array();
  for (let i = 0; i < nf; i++) { dec.GetFaceFromMesh(mesh, i, fa); idx[i * 3] = fa.GetValue(0); idx[i * 3 + 1] = fa.GetValue(1); idx[i * 3 + 2] = fa.GetValue(2); }
  out.indices = idx; out.attrCount = mesh.num_attributes();
  M.destroy(fa); M.destroy(mesh); M.destroy(buf); M.destroy(dec);
  return out;
}
