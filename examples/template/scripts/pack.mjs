// Whole Roblox packs by id: a catalog bundle (body package, dynamic head + mood, animation pack, outfit) or a single
// asset (accessory, shirt, emote, Toolbox model). Downloaded once into the shared cache (~/.cache/blockrig/roblox, or
// BLOCKRIG_CACHE) and reused by every video; copied into assets/roblox/packs/ (git-ignored) for this one.
// Roblox allows its items in videos; they belong to Roblox and their creators: never commit them.
//
//   npm run pack                          every pack in assets/manifest.json "packs" ({ "boy": "bundle:949" })
//   npm run pack -- bundle:949 boy        add a pack to the manifest under a name, and fetch it
//   npm run pack -- links <file>          give the cache the links the browser script returned (then run again)
//
// Bundle details are public (catalog.roblox.com). Asset files need the user's signed-in browser: when some are
// missing, this writes assets/roblox/pack-links.js; run it in the browser pane on https://assetdelivery.roblox.com
// (signed in to Roblox), save what it returns to a file, `npm run pack -- links <file>`, and run `npm run pack` again.
// Each round can reveal more (a bundle names its items, an item its meshes and textures, an animation pack its
// keyframe sequences); usually two or three rounds. In code: usePacks() (src/cast/packs.ts) -> rigFromPack(...).
import fs from "node:fs";
import { packCache, fillPack, locateScript, exportPack } from "blockrig/pack/cache";
import { parsePackRef } from "blockrig/pack";
import { decodeDraco } from "./draco.mjs";

const cache = packCache(), args = process.argv.slice(2);
if (args[0] === "links") {
  const text = fs.readFileSync(args[1] ?? 0, "utf8");
  console.log(`${cache.addLinks(text)} link(s) added to ${cache.dir}`);
  const fails = /# not available: (.*)/.exec(text); if (fails) console.log(`not available: ${fails[1]}${/Authentication/.test(fails[1]) ? "\n  sign in to roblox.com in the browser pane, then run the script again" : ""}`);
  process.exit(0);
}
const MANIFEST = "assets/manifest.json", manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
if (args[0]) {
  const ref = parsePackRef(args[0]), name = args[1] ?? ref.key;
  manifest.packs = { ...(manifest.packs ?? {}), [name]: `${ref.type}:${ref.id}` };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`assets/manifest.json packs.${name} = ${ref.type}:${ref.id}`);
}
const packs = Object.entries(manifest.packs ?? {});
if (!packs.length) { console.log('no packs yet: npm run pack -- bundle:<id> <name>'); process.exit(0); }

const OUT = "assets/roblox/packs", index = {}, missing = [];
for (const [name, ref] of packs) {
  const r = await fillPack(ref, cache, { decodeDraco, log: (m) => console.log(`  ${name}: ${m}`) });
  if (r.pack) {
    exportPack(r.pack, cache, OUT); index[name] = r.pack.key;
    const p = r.pack, anims = Object.entries(p.animations).map(([k, v]) => `${k}${v.length > 1 ? "x" + v.length : ""}`);
    console.log(`${name} (${p.ref} "${p.name ?? ""}"): ${[Object.keys(p.body).length ? `body ${Object.keys(p.body).length} parts` : "", p.head ? `${p.head.dynamic ? "dynamic " : ""}head` : "", p.accessories.length ? `${p.accessories.length} accessories` : "", Object.keys(p.clothing).join(" "), anims.length ? `animations ${anims.join(" ")}` : "", p.map ? `map ${p.map.parts.length} parts` : ""].filter(Boolean).join(", ")}`);
  } else { missing.push(...r.missing); console.log(`${name} (${ref}): ${r.missing.length} file(s) still needed`); }
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
if (missing.length) {
  const uniq = [...new Map(missing.map((m) => [m.key, m])).values()];
  fs.writeFileSync("assets/roblox/pack-links.js", locateScript(uniq));
  console.log(`\n${uniq.length} file(s) need the signed-in browser: run assets/roblox/pack-links.js in the browser pane on
https://assetdelivery.roblox.com (signed in to Roblox), save what it returns to a file, then
  npm run pack -- links <file>
  npm run pack`);
} else console.log(`packs ready: ${Object.keys(index).join(", ")} (assets/roblox/packs; cache ${cache.dir})`);
