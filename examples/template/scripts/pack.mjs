// Whole Roblox packs by id: a catalog bundle (body package, dynamic head + mood, animation pack, outfit), an outfit,
// a player's whole avatar (user:<name or id>), or a single asset (accessory, shirt, emote, Toolbox model).
// Downloaded once into the shared cache (~/.cache/blockrig/roblox, or BLOCKRIG_CACHE) and reused by every video;
// copied into assets/roblox/packs/ (git-ignored) for this one. Roblox allows its items in videos; they belong to
// Roblox and their creators: never commit them.
//
//   npm run pack                          every pack in assets/manifest.json "packs" ({ "boy": "bundle:949" })
//   npm run pack -- bundle:949 boy        add a pack under a name, and fetch it (also user:<name>, outfit:<id>, asset:<id>)
//   npm run pack -- --refresh             fetch players' avatars and outfits again (they change); files stay cached
//   npm run pack -- links <file>          the manual route: give the cache links saved from the browser script
//
// Details (catalog, avatar and users APIs) are public. Asset files need the user's signed-in browser, round after
// round (a bundle names its items, an item its meshes and textures, an animation pack its keyframe sequences). While
// files are missing this keeps running and takes links two ways:
//   - a normal browser (Chrome): run assets/roblox/pack-links.js ONCE on https://assetdelivery.roblox.com; it talks
//     to the link server on 127.0.0.1:8799 and feeds every round by itself;
//   - the in-app browser pane (it blocks pages from calling 127.0.0.1): each round, run assets/roblox/pack-round.js
//     there and save what it returns as assets/roblox/pack-links.txt; this picks the file up, downloads, and writes
//     the next round's pack-round.js, until it prints "packs ready".
// In code: usePacks() (src/cast/packs.ts) -> rigFromPack(...).
import fs from "node:fs";
import { packCache, fillPack, locateScript, exportPack, linkServer, browserLoop } from "blockrig/pack/cache";
import { parsePackRef } from "blockrig/pack";
import { decodeDraco } from "./draco.mjs";

const cache = packCache(), args = process.argv.slice(2).filter((a) => !a.startsWith("--")), refresh = process.argv.includes("--refresh");
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
if (!packs.length) { console.log("no packs yet: npm run pack -- bundle:<id> <name>  (or user:<name>, outfit:<id>, asset:<id>)"); process.exit(0); }

const OUT = "assets/roblox/packs", logged = new Set();
// packs already exported stay listed (a second npm run pack, or one that stops early, never drops them)
const index = (() => { try { const old = JSON.parse(fs.readFileSync(`${OUT}/index.json`, "utf8")); return Object.fromEntries(Object.entries(old).filter(([k, key]) => manifest.packs?.[k] && fs.existsSync(`${OUT}/${key}/pack.json`))); } catch { return {}; } })();
const describe = (p) => [p.bundleType === "Avatar" ? `${p.rigType ?? ""} avatar of ${p.name}` : "", Object.keys(p.body).length ? `body ${Object.keys(p.body).length} parts` : "", p.head ? `${p.head.dynamic ? "dynamic " : ""}head` : "",
  p.accessories.length ? `${p.accessories.length} accessories` : "", Object.keys(p.clothing).join(" "), Object.keys(p.animations).length ? `animations ${Object.entries(p.animations).map(([k, v]) => `${k}${v.length > 1 ? "x" + v.length : ""}`).join(" ")}` : "",
  p.bodyColors ? "body colours" : "", p.map ? `map ${p.map.parts.length} parts` : ""].filter(Boolean).join(", ");
let missing = [];
async function round(first) {
  missing = [];
  for (const [name, ref] of packs) {
    if (index[name] && !first) continue;
    const r = await fillPack(ref, cache, { decodeDraco, refresh: first && refresh, log: (m) => console.log(`  ${name}: ${m}`) });
    if (r.pack) { exportPack(r.pack, cache, OUT); index[name] = r.pack.key; console.log(`${name} (${r.pack.ref} "${r.pack.name ?? ""}"): ${describe(r.pack)}`); }
    else { missing.push(...r.missing); if (!logged.has(name)) { logged.add(name); console.log(`${name} (${ref}): files still needed`); } }
  }
  missing = [...new Map(missing.map((m) => [m.key, m])).values()];
}
await round(true);
if (missing.length) {
  const server = linkServer(cache, () => (missing.length ? missing : null));
  try { await server.ready; } catch (e) { console.log(`link server: ${e.message} (another npm run pack running?)`); }
  fs.writeFileSync("assets/roblox/pack-links.js", browserLoop(server.url));
  const ROUND = "assets/roblox/pack-round.js", DROP = "assets/roblox/pack-links.txt";
  const nextRound = () => fs.writeFileSync(ROUND, locateScript(missing));
  // links saved to a file (the in-app browser's route): picked up as soon as the file appears
  const fromFile = (ms) => new Promise((ok) => {
    const t0 = Date.now(), tick = setInterval(() => {
      if (fs.existsSync(DROP)) { clearInterval(tick); const text = fs.readFileSync(DROP, "utf8"); fs.rmSync(DROP); const fails = /# not available: (.*)/.exec(text); ok({ added: cache.addLinks(text), fails: fails ? fails[1] : null }); }
      else if (Date.now() - t0 > ms) { clearInterval(tick); ok(null); }
    }, 500);
  });
  nextRound();
  console.log(`\n${missing.length} file(s) need the signed-in browser (https://assetdelivery.roblox.com, signed in to Roblox):
  Chrome: run assets/roblox/pack-links.js once; it feeds every round
  in-app browser: run assets/roblox/pack-round.js, save its result as assets/roblox/pack-links.txt; repeat with the new pack-round.js
Waiting (Ctrl+C to stop)...`);
  while (missing.length) {
    const got = await Promise.race([server.waitForLinks(10 * 60 * 1000), fromFile(10 * 60 * 1000)]);
    if (!got) { console.log("no links for 10 minutes: stopping (run npm run pack again)"); break; }
    if (got.fails) console.log(`  not available: ${got.fails}`);
    if (!got.added) { console.log(/Authentication/.test(got.fails ?? "") ? "  sign in to roblox.com in the browser pane, then run npm run pack again" : "  nothing more can be downloaded"); break; }
    await round(false);
    if (missing.length) { nextRound(); console.log(`next round: ${missing.length} file(s); assets/roblox/pack-round.js is updated`); }
  }
  await new Promise((r) => setTimeout(r, 3000)); // let the browser loop see "done"
  server.close();
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
console.log(missing.length ? `${missing.length} file(s) still missing; ready: ${Object.keys(index).join(", ") || "none"}` : `packs ready: ${Object.keys(index).join(", ")} (assets/roblox/packs; cache ${cache.dir})`);
