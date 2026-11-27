// Roblox catalog items (hair, clothing, dynamic heads) for LOCAL videos only. They belong to Roblox and their
// creators: everything lands in assets/roblox/ (git-ignored), is never committed, and never appears in a published
// or README video. The user signs in to Roblox in the browser pane themselves; nothing here reads cookies.
//
// Asset delivery needs the signed-in browser, so this runs as a loop (the agent drives it; see the assets skill):
//   1. node scripts/fetch-roblox.mjs          downloads what it can and, if something is still missing, writes
//                                             assets/roblox/needs.json and prints a browser script
//   2. run that script in the browser pane on a roblox.com page; save its JSON result as assets/roblox/locations.json
//   3. repeat 1-2 until it says "roblox items ready" (items reference meshes and textures, fetched in a later round)
// assets/manifest.json "roblox":
//   { "heroHair": { "assetId": 376548738, "kind": "hair" }, "heroShirt": { "assetId": 382537702, "kind": "shirt" },
//     "heroPants": { "assetId": 382538503, "kind": "pants" }, "boyHead": { "bundle": 949, "kind": "head" } }
// Output: assets/roblox/<name>/... and assets/roblox/cast.json (what src/cast/roblox.ts loads).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseRbxm, describeAccessory, describeClothing, findInstance, assetId } from "blockrig";

const DIR = "assets/roblox", manifest = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));
const items = Object.entries(manifest.roblox ?? {}).filter(([k, v]) => !k.startsWith("$") && (v.assetId || v.bundle)).map(([name, v]) => ({ name, ...v }));
const locFile = path.join(DIR, "locations.json"), locations = fs.existsSync(locFile) ? JSON.parse(fs.readFileSync(locFile, "utf8")) : {};
const file = (key) => path.join(DIR, key);
const have = (key) => fs.existsSync(file(key));
fs.mkdirSync(DIR, { recursive: true });

async function download(key, url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`${key}: ${r.status}`);
  let b = Buffer.from(await r.arrayBuffer());
  if (b[0] === 0x28 && b[1] === 0xb5 && zlib.zstdDecompressSync) b = zlib.zstdDecompressSync(b);
  fs.mkdirSync(path.dirname(file(key)), { recursive: true }); fs.writeFileSync(file(key), b);
  return b;
}
const isImage = (b) => (b[1] === 0x50 && b[2] === 0x4e) || (b[0] === 0xff && b[1] === 0xd8);
// head bundles: the dynamic head is the item whose MeshPart carries FaceControls; the mood animation has keyframes
function inspectBundleFile(key) {
  const b = fs.readFileSync(file(key)), head = b.subarray(0, 8).toString("latin1");
  if (!head.startsWith("<roblox")) return null;
  const roots = parseRbxm(b);
  const mp = findInstance(roots, (x) => x.className === "MeshPart" && x.children.some((c) => c.className === "FaceControls"));
  if (mp) return { type: "head", mp, roots };
  if (findInstance(roots, (x) => x.className === "KeyframeSequence" || x.className === "CurveAnimation")) return { type: "mood" };
  return null;
}

// ---- 1. download whatever has a location, and collect what is still needed
const needs = [], cast = {};
const want = (key, id, format) => { if (have(key)) return true; if (locations[key]) return false; needs.push({ key, id, format }); return false; };
for (const [key, url] of Object.entries(locations)) if (url && !have(key)) { try { await download(key, url); console.log(`downloaded ${key}`); } catch (e) { console.log(`  ${e.message} (the link expired? run again for a fresh one)`); delete locations[key]; } }

for (const it of items) {
  const base = it.name;
  if (it.kind === "head") {
    if (!it.bundle) { console.log(`${base}: heads come as bundles ("bundle": <id>)`); continue; }
    const files = fs.existsSync(file(base)) ? fs.readdirSync(file(base)).filter((f) => f.startsWith("bundle-")) : [];
    if (!files.length) { if (!locations[`${base}/bundle`]) needs.push({ key: `${base}/bundle`, bundle: it.bundle, format: "avatar_meshpart_head" }); continue; }
    let head = null, mood = null;
    for (const f of files) { const k = `${base}/${f}`, info = inspectBundleFile(k); if (info?.type === "head") head = { key: k, ...info }; if (info?.type === "mood") mood = k; }
    if (!head) { console.log(`${base}: no dynamic head in the bundle`); continue; }
    const mp = head.mp, meshId = assetId(mp.props.MeshId), texId = assetId(mp.props.TextureID) ?? assetId(mp.children.find((c) => c.className === "SurfaceAppearance")?.props.ColorMap);
    const okMesh = want(`${base}/mesh`, meshId), okTex = texId ? want(`${base}/texture`, texId) : true;
    const attachments = Object.fromEntries(mp.children.filter((c) => c.className === "Attachment").map((a) => [a.props.Name, a.props.CFrame.pos]));
    if (okMesh && okTex) cast[base] = { kind: "head", mesh: `roblox/${base}/mesh`, texture: texId ? `roblox/${base}/texture` : null, size: mp.props.size ?? mp.props.Size, attachments, mood: mood ? `roblox/${mood}` : null };
    continue;
  }
  const itemKey = `${base}/item`;
  if (!want(itemKey, it.assetId, it.format)) continue;
  const roots = parseRbxm(fs.readFileSync(file(itemKey)));
  if (it.kind === "shirt" || it.kind === "pants") {
    const c = describeClothing(roots), id = it.kind === "shirt" ? c.shirt : c.pants;
    if (!id) { console.log(`${base}: no ${it.kind} template in the item`); continue; }
    if (want(`${base}/template`, id)) cast[base] = { kind: it.kind, template: `roblox/${base}/template` };
  } else {
    const a = describeAccessory(roots), texId = a.textureId ?? a.colorMapId;
    const okMesh = want(`${base}/mesh`, a.meshId), okTex = texId ? want(`${base}/texture`, texId) : true;
    if (okMesh && okTex) cast[base] = { kind: it.kind ?? "accessory", mesh: `roblox/${base}/mesh`, texture: texId ? `roblox/${base}/texture` : null, attachment: a.attachment };
  }
}
fs.writeFileSync(locFile, JSON.stringify(locations, null, 1));
for (const [n, c] of Object.entries(cast)) if (c.template && !isImage(fs.readFileSync(path.join("assets", c.template)))) console.log(`  warning: ${n} template is not an image`);
fs.writeFileSync(path.join(DIR, "cast.json"), JSON.stringify(cast, null, 1));

// ---- 2. what is still missing: write needs.json and print the browser script
if (!needs.length) { console.log(`roblox items ready: ${Object.keys(cast).length} in assets/roblox/cast.json (local only: never commit or publish them)`); process.exit(0); }
fs.writeFileSync(path.join(DIR, "needs.json"), JSON.stringify(needs, null, 1));
console.log(`${needs.length} item(s) need a signed-in browser. Run this in the browser pane on a roblox.com page, save the result as ${locFile} (merge with the existing keys), then run this script again:\n`);
console.log(`(async () => {
  const needs = ${JSON.stringify(needs)};
  const loc = async (id, format) => { const r = await fetch("https://assetdelivery.roblox.com/v2/assetId/" + id, { credentials: "include", headers: format ? { "Roblox-AssetFormat": format } : {} }); const j = await r.json(); return (j.locations || [])[0]?.location || null; };
  const out = {};
  for (const n of needs) {
    if (n.bundle) {
      const b = await (await fetch("https://catalog.roblox.com/v1/bundles/" + n.bundle + "/details", { credentials: "include" })).json();
      for (const it of (b.items || []).filter((i) => i.type === "Asset")) out[n.key + "-" + it.id] = await loc(it.id, n.format);
    } else out[n.key] = await loc(n.id, n.format);
  }
  return JSON.stringify(out);
})()`);
