// Regression tests: compare today's output against snapshots committed in test/__snapshots__.
// Run `npm run test:update` after an intentional change to refresh them, and review the diff.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRig } from "../src/rig.js";
import { Animator } from "../src/animator.js";
import { clips } from "../src/clips.js";
import { makeCoat } from "../src/garment.js";
import { writeMesh } from "../src/writer.js";
import { parseMesh } from "../src/mesh.js";
import { skinnedWorld, r3 } from "./helpers/skin.js";

const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";
const dir = new URL("./__snapshots__/", import.meta.url);

function snapshot(name, value, eps = 2e-3) {
  const file = new URL(`${name}.json`, dir);
  if (UPDATE || !existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(value, null, 1) + "\n");
    if (!UPDATE) console.log(`  wrote new snapshot ${name}.json`);
    return;
  }
  compare(JSON.parse(readFileSync(file, "utf8")), value, name, eps);
}
function compare(want, got, path, eps) {
  if (typeof want === "number") { assert.ok(typeof got === "number" && Math.abs(want - got) <= eps, `${path}: expected ${want}, got ${got}`); return; }
  if (Array.isArray(want)) { assert.equal(got.length, want.length, `${path}: length`); want.forEach((w, i) => compare(w, got[i], `${path}[${i}]`, eps)); return; }
  if (want && typeof want === "object") { assert.deepEqual(Object.keys(got).sort(), Object.keys(want).sort(), `${path}: keys`); for (const k in want) compare(want[k], got[k], `${path}.${k}`, eps); return; }
  assert.equal(got, want, path);
}

test("regression: mesh writer output is byte-for-byte stable", () => {
  const coat = makeCoat();
  const out = {};
  for (const v of ["2.00", "3.00", "4.00", "6.00"]) { const b = writeMesh(coat, v); out[v] = { bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") }; }
  snapshot("mesh-writer", out);
});

test("regression: committed v4 fixture still parses the same", () => {
  const fixture = new URL("./fixtures/coat-v4.mesh", import.meta.url);
  if (!existsSync(fixture)) { mkdirSync(new URL("./fixtures/", import.meta.url), { recursive: true }); writeFileSync(fixture, writeMesh(makeCoat(), "4.00")); }
  const p = parseMesh(readFileSync(fixture));
  snapshot("fixture-coat-v4", {
    version: p.version, vertexCount: p.vertexCount, faceCount: p.faceCount, lods: p.lods,
    bones: p.bones.map((b) => [b.name, b.parent]),
    sample: [0, 50, 100, 200, 300].map((i) => ({ pos: Array.from(p.positions.slice(i * 3, i * 3 + 3)).map((x) => +x.toFixed(4)), skin: Array.from(p.skinIndex.slice(i * 4, i * 4 + 4)), w: Array.from(p.skinWeight.slice(i * 4, i * 4 + 4)).map((x) => +x.toFixed(4)) })),
  });
});

test("regression: every clip produces the same joint positions and coat shape over time", () => {
  const out = {};
  const coat = makeCoat();
  const probe = [0, 37, 81, 150, 222, coat.vertexCount - 1];
  for (const [name, c] of Object.entries(clips)) {
    const rig = createRig({ body: false }), an = new Animator(rig);
    const sm = rig.addLayeredClothing(coat);
    an.play(clips.idle, { fade: 0 });
    if (name !== "idle") an.play(c, { fade: 0 });
    const frames = [];
    let t = 0;
    for (const f of [0, 0.25, 0.5, 0.75]) {
      const target = f * c.length; an.update(Math.max(1e-6, target - t)); t = target;
      const joints = {};
      for (const j of rig.joints) joints[j] = r3(rig.jointPosition(j));
      frames.push({ t: +target.toFixed(4), joints, coat: probe.map((i) => r3(skinnedWorld(sm, i))) });
    }
    out[name] = frames;
  }
  snapshot("clips", out);
});
