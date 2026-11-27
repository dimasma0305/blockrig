// Roblox catalog items (hair, faces, heads, clothing, animations, bundles) for LOCAL use only. They belong to
// Roblox and their creators: they go in assets/roblox/ (git-ignored), are never committed, and never appear in
// a published or README video. The user signs in to Roblox themselves; this script never reads cookies.
//
// Two steps, because the asset delivery API needs the user's signed-in browser:
//   1. node scripts/fetch-roblox.mjs snippet
//        prints a script. The agent runs it in the browser pane on a roblox.com page where the user is signed in;
//        it asks the asset delivery API for each item in assets/manifest.json "roblox" and returns their CDN
//        locations. Save that JSON as assets/roblox/locations.json.
//   2. node scripts/fetch-roblox.mjs
//        downloads every location (public CDN, no login) into assets/roblox/<name>.<ext>.
// Then read them with BlockRig: parseRbxm, describeAccessory, describeHead, describeClothing, parseMesh,
// keyframeSequenceToClip, curveAnimationToClip (see BlockRig's README).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const manifest = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));
const items = Object.entries(manifest.roblox ?? {}).filter(([k, v]) => !k.startsWith("$") && v.assetId).map(([name, v]) => ({ name, ...v }));
const dir = "assets/roblox";

if (process.argv[2] === "snippet") {
  // Formats: "avatar_meshpart_accessory" (layered clothing with WrapLayer), "avatar_meshpart_head" (dynamic heads
  // with FACS), or none for the plain asset.
  console.log(`(async () => {
  const items = ${JSON.stringify(items.map(({ name, assetId, format }) => ({ name, assetId, format })))};
  const out = {};
  for (const it of items) {
    const headers = it.format ? { "Roblox-AssetFormat": it.format } : {};
    const r = await fetch("https://assetdelivery.roblox.com/v2/assetId/" + it.assetId, { credentials: "include", headers });
    const j = await r.json();
    out[it.name] = (j.locations || []).map((l) => l.location);
  }
  return JSON.stringify(out);
})()`);
  process.exit(0);
}

const locFile = path.join(dir, "locations.json");
if (!fs.existsSync(locFile)) { console.error(`No ${locFile}. Run "node scripts/fetch-roblox.mjs snippet" first (see the assets skill).`); process.exit(1); }
const locations = JSON.parse(fs.readFileSync(locFile, "utf8"));
for (const [name, urls] of Object.entries(locations)) {
  for (const [i, url] of (urls ?? []).entries()) {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) { console.log(`${name}: ${r.status}`); continue; }
    let b = Buffer.from(await r.arrayBuffer());
    if (b[0] === 0x28 && b[1] === 0xb5 && zlib.zstdDecompressSync) b = zlib.zstdDecompressSync(b); // zstd frames
    const head = b.subarray(0, 16).toString("latin1");
    const ext = head.startsWith("<roblox!") ? "rbxm" : head.startsWith("<roblox") ? "rbxmx" : head.startsWith("version ") ? "mesh" : b[1] === 0x50 && b[2] === 0x4e ? "png" : b[0] === 0xff && b[1] === 0xd8 ? "jpg" : "bin";
    const file = path.join(dir, `${name}${i ? "-" + i : ""}.${ext}`);
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, b);
    console.log(`${file}  ${b.length} bytes`);
  }
}
