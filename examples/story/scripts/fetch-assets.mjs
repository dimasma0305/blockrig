// Download the CC0 environment assets listed in scripts/assets.json into public/cc0/ (git-ignored).
import fs from "node:fs";
import path from "node:path";

const list = JSON.parse(fs.readFileSync("scripts/assets.json", "utf8"));
const root = "public/cc0";
const get = async (url) => { const r = await fetch(url, { headers: { "user-agent": "blockrig-story-example" } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); };

for (const [pack, spec] of Object.entries(list)) {
  const dir = path.join(root, pack);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "LICENSE.txt"), `${spec.licence}\n`);
  for (const f of spec.files || []) {
    const out = path.join(dir, f);
    if (fs.existsSync(out)) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await get(spec.base + f));
    console.log(`${pack}/${f}`);
  }
  if (spec.hdri) {
    const { id, resolution, format } = spec.hdri;
    const out = path.join(dir, `${id}_${resolution}.${format}`);
    if (!fs.existsSync(out)) {
      const files = JSON.parse((await get(`https://api.polyhaven.com/files/${id}`)).toString());
      fs.writeFileSync(out, await get(files.hdri[resolution][format].url));
      console.log(`${pack}/${path.basename(out)}`);
    }
  }
}
console.log("assets ready in public/cc0");
