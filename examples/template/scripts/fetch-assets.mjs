// Download the CC0 assets listed in assets/manifest.json (keys starting with "$" are examples and skipped):
//   cc0:      model packs        -> assets/cc0/<pack>/          (licence file written next to them)
//   textures: Poly Haven PBR sets -> assets/textures/<id>/        (diff / rough / nor_gl maps)
//   hdri:     Poly Haven skies   -> assets/cc0/hdri/<id>_<res>.hdr
// All of these folders are git-ignored. Only CC0 sources here; Roblox items go through fetch-roblox.mjs.
import fs from "node:fs";
import path from "node:path";

const manifest = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));
const real = (o) => Object.entries(o ?? {}).filter(([k]) => !k.startsWith("$"));
const get = async (url) => { const r = await fetch(url, { headers: { "user-agent": "blockrig-video-template" } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); };
const save = async (file, url) => { if (fs.existsSync(file)) return; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, await get(url)); console.log(file); };

for (const [pack, spec] of real(manifest.cc0)) {
  const dir = path.join("assets/cc0", pack);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "LICENSE.txt"), `${spec.licence}\n`);
  for (const f of spec.files ?? []) await save(path.join(dir, f), spec.base + f);
}
for (const [name, t] of real(manifest.textures)) {
  const files = JSON.parse((await get(`https://api.polyhaven.com/files/${t.id}`)).toString());
  for (const map of t.maps ?? ["diff", "rough", "nor_gl"]) {
    const entry = Object.entries(files).find(([k]) => k.toLowerCase() === map.toLowerCase())?.[1];
    const f = entry?.[t.resolution ?? "1k"]?.jpg ?? entry?.[t.resolution ?? "1k"]?.png;
    if (f) await save(path.join("assets/textures", name, `${map}.${f.url.split(".").pop()}`), f.url);
  }
  fs.writeFileSync(path.join("assets/textures", name, "LICENSE.txt"), `CC0 (Poly Haven, https://polyhaven.com/a/${t.id})\n`);
}
for (const [name, h] of real(manifest.hdri)) {
  const files = JSON.parse((await get(`https://api.polyhaven.com/files/${h.id}`)).toString());
  await save(path.join("assets/cc0/hdri", `${name}_${h.resolution ?? "1k"}.hdr`), files.hdri[h.resolution ?? "1k"].hdr.url);
}
console.log("assets ready");
