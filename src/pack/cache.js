// A disk cache for Roblox packs, shared by every video on the machine (Node only): bundle details and asset files
// are downloaded once and reused by id. Default folder: ~/.cache/blockrig/roblox (or BLOCKRIG_CACHE).
//   <cache>/bundles/<id>.json          catalog bundle details
//   <cache>/assets/<id>[@format]       asset files as delivered (ZSTD inflated, v7 Draco meshes stored as v4)
//   <cache>/links.json                 short-lived asset delivery links waiting to be downloaded
//
//   const cache = packCache();
//   let r = await fillPack("bundle:949", cache);           // downloads bundle details and every linked file
//   r.missing                                              // assets that need a link from the signed-in browser:
//   locateScript(r.missing)                                //   run this in the browser on a roblox.com page,
//   cache.addLinks(text)                                   //   give back what it returns, and fillPack again
//   exportPack(r.pack, cache, "assets/roblox/packs")       // copy the pack's files next to the video
//
// Asset delivery needs the user's own Roblox sign-in, so only the browser step can ask for links; this module never
// reads cookies. Bundle details (catalog.roblox.com) are public. Roblox items belong to Roblox and their creators.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import http from "node:http";
import { resolvePack, fileKey, parsePackRef } from "./pack.js";
import { parseMesh } from "../mesh.js";
import { writeMesh } from "../writer.js";

/** The shared cache folder. */
export const defaultCacheDir = () => process.env.BLOCKRIG_CACHE || path.join(os.homedir(), ".cache", "blockrig", "roblox");
const safe = (key) => key.replace(/[^\w@.-]/g, "_");

// Asset delivery links are long; the browser scripts write them compactly ("key f|c sc hash exp hmac", a third of
// the size) so fewer characters pass through the browser step. shortLink runs in the browser (it is inlined into
// the scripts); expandLink turns the compact form back into the URL.
function shortLink(k, u) {
  let m = /^https:\/\/fts\.rbxcdn\.com\/v2\/(sc\d)\/([0-9a-f]+)\?encoding=zstd&version=1&__token__=key-id=1~exp=(\d+)~acl=[^~]+~hmac=([0-9a-f]+)&Expires=\d+$/.exec(u);
  if (m) return k + " f " + m.slice(1).join(" ");
  m = /^https:\/\/contentdelivery\.roblox\.com\/v1\/bytes\/(sc\d)\/([0-9a-f]+)\?__token__=exp=(\d+)~acl=[^~]+~hmac=([0-9a-f]+)$/.exec(u);
  return m ? k + " c " + m.slice(1).join(" ") : k + " " + u;
}
const expandLink = (p) => (p[1] === "f" && p.length === 6 ? [p[0], `https://fts.rbxcdn.com/v2/${p[2]}/${p[3]}?encoding=zstd&version=1&__token__=key-id=1~exp=${p[4]}~acl=/${p[2]}/${p[3]}*~hmac=${p[5]}&Expires=${p[4]}`]
  : p[1] === "c" && p.length === 6 ? [p[0], `https://contentdelivery.roblox.com/v1/bytes/${p[2]}/${p[3]}?__token__=exp=${p[4]}~acl=/v1/bytes/${p[2]}/${p[3]}*~hmac=${p[5]}`] : p);

/** A cache store (the `store` resolvePack reads) with writers. */
export function packCache(dir = defaultCacheDir()) {
  const bdir = path.join(dir, "bundles"), adir = path.join(dir, "assets"), lfile = path.join(dir, "links.json");
  fs.mkdirSync(bdir, { recursive: true }); fs.mkdirSync(adir, { recursive: true });
  const links = () => (fs.existsSync(lfile) ? JSON.parse(fs.readFileSync(lfile, "utf8")) : {});
  return {
    dir,
    bundle(id) { const f = path.join(bdir, `${id}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; },
    putBundle(id, details) { fs.writeFileSync(path.join(bdir, `${id}.json`), JSON.stringify(details, null, 1)); },
    /** Cached details: a bundle, an outfit, a user's avatar, or a username's `{ id }` (users and outfits change: re-fetch with refresh). */
    details(type, id) { if (type === "bundle") return this.bundle(id); const f = path.join(bdir, `${type}-${safe(String(id))}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; },
    putDetails(type, id, d) { if (type === "bundle") return this.putBundle(id, d); fs.writeFileSync(path.join(bdir, `${type}-${safe(String(id))}.json`), JSON.stringify(d, null, 1)); },
    dropDetails(type, id) { const f = type === "bundle" ? path.join(bdir, `${id}.json`) : path.join(bdir, `${type}-${safe(String(id))}.json`); if (fs.existsSync(f)) fs.rmSync(f); },
    /** The file's path in the cache (whether or not it is there yet). */
    path(id, format = null) { return path.join(adir, safe(fileKey(id, format))); },
    asset(id, format = null) { const f = this.path(id, format); return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null; },
    putAsset(id, format, bytes) { fs.writeFileSync(this.path(id, format), bytes); },
    links,
    /** Add links: an object `{ key: url }`, or the text the browser script returns (one "key url" per line). */
    addLinks(more) {
      const add = typeof more === "string" ? Object.fromEntries(more.split(/\r?\n/).filter((l) => !l.startsWith("#")).map((l) => expandLink(l.trim().split(/\s+/))).filter((p) => p.length === 2 && /^https:\/\//.test(p[1]))) : more;
      fs.writeFileSync(lfile, JSON.stringify({ ...links(), ...add }, null, 1));
      return Object.keys(add).length;
    },
    dropLink(key) { const l = links(); delete l[key]; fs.writeFileSync(lfile, JSON.stringify(l, null, 1)); },
  };
}

const inflate = (b) => (b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd && zlib.zstdDecompressSync ? zlib.zstdDecompressSync(b) : b);
const zstd = zlib.zstdDecompressSync ? (b) => new Uint8Array(zlib.zstdDecompressSync(b)) : undefined;

// public Roblox APIs (no sign-in): catalog bundle details, an outfit's or a user's avatar, a username's id
async function publicDetails(type, id, get) {
  // Roblox rate-limits these APIs (429): wait and retry with backoff (Retry-After when it says)
  const call = async (url, init) => {
    for (let i = 0; ; i++) {
      const res = await get(url, init);
      if (res.status !== 429 || i >= 5) return res;
      const wait = Math.min(30, Number(res.headers?.get?.("retry-after")) || 2 ** (i + 1));
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  };
  const json = async (res, what) => { if (!res.ok) throw Object.assign(new Error(`${what}: Roblox answered ${res.status}`), { status: res.status }); return res.json(); };
  if (type === "bundle") return json(await call(`https://catalog.roblox.com/v1/bundles/${id}/details`), `bundle ${id}`);
  if (type === "outfit") return json(await call(`https://avatar.roblox.com/v1/outfits/${id}/details`), `outfit ${id}`);
  if (type === "user") return json(await call(`https://avatar.roblox.com/v1/users/${id}/avatar`), `user ${id}`);
  if (type === "username") {
    const j = await json(await call("https://users.roblox.com/v1/usernames/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ usernames: [id], excludeBannedUsers: true }) }), `user ${id}`);
    const u = (j.data ?? [])[0]; if (!u) throw new Error(`no Roblox user named "${id}"`);
    return { id: u.id, name: u.name };
  }
  throw new Error(`unknown details type ${type}`);
}

/**
 * Fill the cache for a pack as far as it can go without the browser: fetch missing bundle details (public), download
 * every asset that has a link waiting, and repeat while that makes progress. v7 (Draco) meshes are stored as v4 when
 * `decodeDraco` is given, so videos need no decoder. Returns resolvePack's `{ pack, missing }` (missing = assets that
 * need links).
 */
export async function fillPack(ref, cache, { fetch: get = globalThis.fetch, decodeDraco, log = () => {}, refresh = false } = {}) {
  // a player's avatar and outfits change over time: `refresh` fetches their details again (assets stay cached by id)
  if (refresh) { const r = parsePackRef(ref); if (r.type === "user" || r.type === "outfit") { if (typeof r.id === "string") cache.dropDetails("username", r.id); else cache.dropDetails(r.type, r.id); } }
  for (let round = 0; round < 12; round++) {
    const r = resolvePack(ref, cache, { zstd });
    if (!r.missing.length) return r;
    let progress = false;
    for (const m of r.missing) {
      if (m.kind === "bundle" || m.kind === "details") {
        const type = m.kind === "bundle" ? "bundle" : m.type;
        try { cache.putDetails(type, m.id, await publicDetails(type, m.id, get)); log(`${type} ${m.id}: details`); }
        catch (e) {
          // a bundle's outfit only adds body colours and scales: go on without them rather than fail the pack
          if (type !== "outfit") throw e;
          cache.putDetails(type, m.id, { unavailable: e.status ?? e.message }); log(`${type} ${m.id}: ${e.message}, going on without its colours and scales`);
        }
        progress = true; continue;
      }
      const url = cache.links()[m.key];
      if (!url) continue;
      try {
        const res = await get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(String(res.status));
        let b = new Uint8Array(inflate(Buffer.from(await res.arrayBuffer())));
        if (decodeDraco && new TextDecoder("latin1").decode(b.subarray(0, 12)) === "version 7.00") b = writeMesh(parseMesh(b, { decodeDraco }), "4.00");
        cache.putAsset(m.id, m.format, b); log(`asset ${m.key}`); progress = true;
      } catch (e) { log(`asset ${m.key}: ${e.message} (the link expired? ask for a fresh one)`); }
      cache.dropLink(m.key);
    }
    if (!progress) return r;
  }
  return resolvePack(ref, cache, { zstd });
}

/**
 * A script for the browser (run it on a roblox.com page while signed in): asks asset delivery for a download link
 * for each missing asset and returns "key url" lines for cache.addLinks().
 */
export function locateScript(missing) {
  const needs = missing.filter((m) => m.kind === "asset").map((m) => [m.key, m.id, m.format]);
  return `(async () => {
  const needs = ${JSON.stringify(needs)};
  const out = [], fails = [], shortLink = ${shortLink.toString()};
  await Promise.all(needs.map(async ([key, id, format]) => {
    try {
      const r = await fetch("https://assetdelivery.roblox.com/v2/assetId/" + id, { credentials: "include", headers: format ? { "Roblox-AssetFormat": format } : {} });
      const j = await r.json(), u = (j.locations || [])[0]?.location;
      if (u) out.push(shortLink(key, u)); else fails.push(key + " " + ((j.errors || [])[0]?.message || r.status));
    } catch (e) { fails.push(key + " " + e.message); }
  }));
  return out.join("\\n") + (fails.length ? "\\n# not available: " + fails.join(", ") : "");
})()`;
}

/**
 * A local link server (127.0.0.1 only) so the browser step runs once instead of once per round: the browser loop
 * (`browserLoop(url)`) asks it what is still needed, gets download links from asset delivery with the user's sign-in,
 * and posts them back; `waitForLinks()` resolves when some arrive. `needs()` returns the missing assets right now,
 * or null when everything is ready (the loop then stops). Nothing but links ever crosses it.
 */
export function linkServer(cache, needs, { port = 8799 } = {}) {
  let waiters = [];
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Private-Network": "true" };
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (req.method === "GET" && req.url === "/needs") {
      const n = needs(), have = cache.links();
      res.writeHead(200, { ...cors, "content-type": "application/json" });
      return res.end(JSON.stringify(n === null ? { done: true } : { done: false, needs: n.filter((m) => m.kind === "asset" && !have[m.key]).map((m) => [m.key, m.id, m.format]) }));
    }
    if (req.method === "POST" && req.url === "/links") {
      let body = ""; req.on("data", (d) => (body += d)).on("end", () => {
        const added = cache.addLinks(body); res.writeHead(200, cors); res.end(String(added));
        const fails = /# not available: (.*)/.exec(body); const w = waiters; waiters = []; for (const f of w) f({ added, fails: fails ? fails[1] : null });
      });
      return;
    }
    res.writeHead(404, cors); res.end();
  });
  const ready = new Promise((ok, fail) => { server.once("error", fail); server.listen(port, "127.0.0.1", () => ok()); });
  return {
    url: `http://127.0.0.1:${port}`, ready,
    /** Resolves with `{ added, fails }` when the browser posts links, or with null after `ms`. */
    waitForLinks(ms = 600000) { return new Promise((ok) => { const t = setTimeout(() => { waiters = waiters.filter((w) => w !== done); ok(null); }, ms); const done = (v) => { clearTimeout(t); ok(v); }; waiters.push(done); }); },
    close() { server.close(); for (const f of waiters) f(null); waiters = []; },
  };
}

/** A script to run ONCE in the browser on https://assetdelivery.roblox.com (signed in): it keeps asking the link server
 *  what is needed, fetches the links, posts them back, and stops when the server says everything is ready. */
export function browserLoop(url) {
  return `(async () => {
  const server = ${JSON.stringify(url)}, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let sent = 0, rounds = 0, fails = []; const shortLink = ${shortLink.toString()};
  for (let idle = 0; idle < 120 && rounds < 40; ) {
    const s = await (await fetch(server + "/needs")).json();
    if (s.done) return "packs ready: sent " + sent + " link(s) in " + rounds + " round(s)" + (fails.length ? "; not available: " + fails.join(", ") : "");
    if (!s.needs.length) { idle++; await sleep(1000); continue; }
    idle = 0; rounds++;
    const out = [], bad = [];
    await Promise.all(s.needs.map(async ([key, id, format]) => {
      try {
        const r = await fetch("https://assetdelivery.roblox.com/v2/assetId/" + id, { credentials: "include", headers: format ? { "Roblox-AssetFormat": format } : {} });
        const j = await r.json(), u = (j.locations || [])[0]?.location;
        if (u) out.push(shortLink(key, u)); else bad.push(key + " " + ((j.errors || [])[0]?.message || r.status));
      } catch (e) { bad.push(key + " " + e.message); }
    }));
    fails = bad; sent += out.length;
    await fetch(server + "/links", { method: "POST", body: out.join("\\n") + (bad.length ? "\\n# not available: " + bad.join(", ") : "") });
    if (!out.length) return "stopped: nothing more is available (" + bad.join(", ") + ")" + (/Authentication/.test(bad.join()) ? ": sign in to roblox.com in this browser" : "");
    await sleep(1500);
  }
  return "stopped after " + rounds + " round(s); run npm run pack again";
})()`;
}

/**
 * Copy a resolved pack's files out of the cache into `<dir>/<pack key>/` (hard links when possible) with its
 * pack.json, so a video's public folder can serve them. Returns the folder.
 */
export function exportPack(pack, cache, dir) {
  const out = path.join(dir, pack.key);
  fs.mkdirSync(out, { recursive: true });
  for (const f of pack.files) {
    const src = cache.path(f.id, f.format), dst = path.join(out, safe(fileKey(f.id, f.format)));
    if (!fs.existsSync(src)) continue;
    if (fs.existsSync(dst)) fs.rmSync(dst);
    try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
  }
  fs.writeFileSync(path.join(out, "pack.json"), JSON.stringify(pack, null, 1));
  return out;
}

export { parsePackRef };
