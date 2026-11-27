// Download every asset listed in assets/manifest.json (keys starting with "$" are notes, skipped). Assets first:
// see the assets skill for where things come from. Everything lands in git-ignored folders under assets/, and
// assets/credits.json records the source and licence of each item (paste CC-BY credits into the video description).
//
//   kenney:    Kenney packs (CC0) by slug        -> assets/kenney/<slug>/...      (zip, signed-link flow, GLB folder kept)
//   github:    raw files from a GitHub repo      -> assets/github/<name>/...      (e.g. KayKit, Kenney starter kits)
//   hdri:      Poly Haven skies (CC0)            -> assets/hdri/<name>.hdr
//   textures:  Poly Haven PBR sets (CC0)         -> assets/textures/<name>/{diff,rough,nor_gl}.jpg
//   ambientcg: ambientCG PBR sets (CC0)          -> assets/textures/<name>/{diff,rough,nor_gl}.jpg
//   polypizza: poly.pizza models (licence read from each page) -> assets/polypizza/<name>.glb
//   node scripts/fetch-assets.mjs [--only <section>]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const manifest = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const entries = (k) => (only && only !== k ? [] : Object.entries(manifest[k] ?? {}).filter(([n]) => !n.startsWith("$")));
const UA = { "user-agent": "Mozilla/5.0 (blockrig-video-template)" };
const creditsFile = "assets/credits.json";
const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, "utf8")) : {};
const credit = (name, o) => { credits[name] = { ...o, fetched: new Date().toISOString().slice(0, 10) }; };

async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers }, redirect: "follow" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
}
const save = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); };
const have = (file) => fs.existsSync(file) && fs.statSync(file).size > 0;

// ---- a small zip reader (stored + deflate), so no unzip tool is needed on any OS
function unzip(buf, keep) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/") || !keep(name)) continue;
    const lnlen = buf.readUInt16LE(off + 26), lxlen = buf.readUInt16LE(off + 28), data = buf.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
    out.push({ name, data: method === 0 ? data : zlib.inflateRawSync(data) });
  }
  return out;
}

// ---- Kenney: page (cookies) -> download-link (cookies + Referer) -> signed zip
async function kenney(slug) {
  const page = `https://kenney.nl/assets/${slug}`;
  const r1 = await get(page);
  const cookies = (r1.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const hex = Buffer.from(`assets/${slug}`).toString("hex");
  const r2 = await get(`https://kenney.nl/download-link/${hex}`, { cookie: cookies, referer: page, "x-requested-with": "XMLHttpRequest", accept: "application/json" });
  const { url } = await r2.json();
  if (!url) throw new Error(`kenney ${slug}: no download link`);
  return Buffer.from(await (await get(url, { cookie: cookies, referer: page })).arrayBuffer());
}

for (const [slug, o] of entries("kenney")) {
  const dir = `assets/kenney/${slug}`;
  if (fs.existsSync(path.join(dir, ".done"))) continue;
  const zip = await kenney(slug);
  // keep the GLB models (+ their textures) and the licence; FBX/OBJ/previews are skipped
  // newer packs call the folder "GLB format", older ones "GLTF format" (both hold .glb files)
  const glb = /Models\/(GLB|GLTF) format\//i;
  const keep = (n) => /(^|\/)(License|LICENSE)[^/]*\.txt$/.test(n) || (glb.test(n) && /\.(glb|gltf|bin|png|jpg)$/i.test(n)) || (o.keep && new RegExp(o.keep).test(n));
  const files = unzip(zip, keep);
  for (const f of files) save(path.join(dir, f.name.replace(/^.*?Models\/(GLB|GLTF) format\//i, "").replace(/^.*\/(License[^/]*\.txt)$/i, "$1")), f.data);
  fs.writeFileSync(path.join(dir, ".done"), "");
  credit(`kenney/${slug}`, { source: `https://kenney.nl/assets/${slug}`, licence: "CC0 1.0", author: "Kenney (kenney.nl)" });
  console.log(`kenney/${slug}: ${files.length} files`);
}

for (const [name, o] of entries("github")) {
  for (const f of o.files) { const out = `assets/github/${name}/${f}`; if (!have(out)) save(out, Buffer.from(await (await get(o.base + encodeURI(f))).arrayBuffer())); }
  credit(`github/${name}`, { source: o.page ?? o.base, licence: o.licence, author: o.author });
  console.log(`github/${name}: ${o.files.length} files`);
}

const phFiles = async (id) => (await get(`https://api.polyhaven.com/files/${id}`)).json();
for (const [name, o] of entries("hdri")) {
  const out = `assets/hdri/${name}.hdr`;
  if (!have(out)) { const f = await phFiles(o.id); save(out, Buffer.from(await (await get(f.hdri[o.res ?? "2k"].hdr.url)).arrayBuffer())); }
  credit(`hdri/${name}`, { source: `https://polyhaven.com/a/${o.id}`, licence: "CC0 1.0", author: "Poly Haven" });
  console.log(`hdri/${name}`);
}
for (const [name, o] of entries("textures")) {
  const f = await phFiles(o.id), res = o.res ?? "1k";
  for (const [map, key] of [["diff", "Diffuse"], ["rough", "Rough"], ["nor_gl", "nor_gl"]]) {
    const e = f[key]?.[res]?.jpg; const out = `assets/textures/${name}/${map}.jpg`;
    if (e && !have(out)) save(out, Buffer.from(await (await get(e.url)).arrayBuffer()));
  }
  credit(`textures/${name}`, { source: `https://polyhaven.com/a/${o.id}`, licence: "CC0 1.0", author: "Poly Haven" });
  console.log(`textures/${name}`);
}
for (const [name, o] of entries("ambientcg")) {
  const dir = `assets/textures/${name}`;
  if (!have(`${dir}/diff.jpg`)) {
    const zip = Buffer.from(await (await get(`https://ambientcg.com/get?file=${o.id}_${o.res ?? "1K-JPG"}.zip`)).arrayBuffer());
    for (const f of unzip(zip, (n) => /_(Color|Roughness|NormalGL)\.jpg$/i.test(n))) save(`${dir}/${/Color/i.test(f.name) ? "diff" : /Roughness/i.test(f.name) ? "rough" : "nor_gl"}.jpg`, f.data);
  }
  credit(`textures/${name}`, { source: `https://ambientcg.com/view?id=${o.id}`, licence: "CC0 1.0", author: "ambientCG" });
  console.log(`textures/${name} (ambientCG)`);
}
for (const [name, o] of entries("polypizza")) {
  const out = `assets/polypizza/${name}.glb`;
  const html = await (await get(`https://poly.pizza/m/${o.id}`)).text();
  const licence = /"Licence"\s*:\s*"([^"]+)"/.exec(html)?.[1] ?? "unknown";
  const author = /"Creator"\s*:\s*\{[^}]*"Username"\s*:\s*"([^"]+)"/.exec(html)?.[1] ?? /"Attribution"\s*:\s*"([^"]+)"/.exec(html)?.[1];
  const glb = /https:\/\/static\.poly\.pizza\/[\w-]+\.glb/.exec(html)?.[0];
  if (!glb) { console.log(`polypizza/${name}: no GLB on the page`); continue; }
  if (!have(out)) save(out, Buffer.from(await (await get(glb)).arrayBuffer()));
  credit(`polypizza/${name}`, { source: `https://poly.pizza/m/${o.id}`, licence, author, animated: /"Animated"\s*:\s*true/.test(html) });
  console.log(`polypizza/${name}: ${licence}${author ? ` by ${author}` : ""}`);
}

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 2) + "\n");
const needCredit = Object.entries(credits).filter(([, c]) => !/^CC0/i.test(c.licence ?? ""));
console.log(`\nassets ready. credits: ${creditsFile}${needCredit.length ? `\nNEEDS CREDIT in the video description:\n${needCredit.map(([n, c]) => `  ${n}: ${c.licence}${c.author ? ` by ${c.author}` : ""} (${c.source})`).join("\n")}` : ""}`);
