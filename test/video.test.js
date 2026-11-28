// blockrig/video: the story-video toolkit. Frame-purity, Roblox part conventions (Part.Shape, WedgePart, NormalId,
// MeshPart Size), the staging check against real Rapier colliders, and drawn boards on a mock canvas.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRig, clips, cframeToMatrix } from "../src/index.js";
import {
  rng, easeInOut, smooth, createTimeline, speakersOf, V, pushIn, orbit, applyCamera, poseAt, groundRig, FEET, ON_SEAT,
  surfaceOf, restOn, daylight, mixDaylight, TIMES, createLighting, avatarAmbient, buildRobloxMap, partGeometry, facePlane, materialLook,
  createProbe, loadRapier, panel, coverFit, pic, banner, poster, standee, videoCard, setCanvasFactory, loadImages,
} from "../src/video/index.js";
import { mockCanvas } from "./helpers/mock-canvas.js";

const close = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} ${a} != ${b}`);
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// ---- motion
test("video: rng is seeded (same seed, same sequence) and easing hits its ends", () => {
  const a = rng(7), b = rng(7), c = rng(8);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepEqual(sa, sb); assert.notEqual(sa[0], c());
  for (const v of sa) assert.ok(v >= 0 && v < 1);
  assert.equal(easeInOut(0), 0); assert.equal(easeInOut(1), 1); close(easeInOut(0.5), 0.5);
  assert.equal(smooth(-1), 0); assert.equal(smooth(2), 1);
});

// ---- timeline
const story = {
  title: "T", slug: "t", fps: 30, width: 1080, height: 1920, voice: { gapSeconds: 0.2 },
  shots: [
    { id: "s01", narration: "one two three four", captions: [{ text: "one two", highlight: "two" }, { text: "three four" }] },
    { id: "s02", narration: "hi mom", speaker: "me", captions: [{ text: "hi mom" }] },
    { id: "s03", narration: "", minSeconds: 3 },
  ],
};
const timings = { clips: { s01: { duration: 2, words: [{ word: "one", start: 0.1, end: 0.3 }, { word: "two", start: 0.4, end: 0.6 }, { word: "three", start: 1.2, end: 1.4 }, { word: "four", start: 1.5, end: 1.9 }] } }, music: [], total: 0 };

test("video: shot lengths come from the voice (plus the gap), else 2.7 words a second", () => {
  const T = createTimeline(story, timings);
  close(T.SHOTS[0].dur, 2.2); assert.equal(T.SHOTS[0].audio, "audio/s01.wav");
  close(T.SHOTS[1].dur, 2 / 2.7 + 0.2, 1e-9, "no clip yet: estimated"); assert.equal(T.SHOTS[1].audio, null);
  assert.equal(T.SHOTS[2].dur, 3, "minSeconds");
  close(T.TOTAL, 2.2 + 2 / 2.7 + 0.2 + 3); assert.equal(T.TOTAL_FRAMES, Math.round(T.TOTAL * 30));
  assert.equal(T.SHOTS[1].startFrame, Math.round(2.2 * 30));
  const at = T.shotAt(2.3); assert.equal(at.shot.id, "s02"); close(at.local, 0.1);
  assert.equal(T.shotAt(999).shot.id, "s03"); assert.equal(T.shotAt(999).p, 1);
  assert.equal(T.byId("s03").idx, 2);
});

test("video: captions pop in on their first spoken word and carry the speaker", () => {
  const T = createTimeline(story, timings);
  const [a, b, c] = T.CAPTIONS;
  close(a.start, 0.1); close(a.end, 1.2, 1e-9, "ends when the next caption starts"); assert.equal(a.highlight, "two");
  close(b.start, 1.2); close(b.end, 2.2, 1e-9, "the last caption runs to the end of its shot");
  assert.equal(c.speaker, "me"); assert.equal(a.speaker, null);
  assert.equal(T.captionAt(0.5), a); assert.equal(T.captionAt(0.05), null);
  const tags = speakersOf(T, { me: { name: "ME", colour: "#1fa392" } });
  assert.deepEqual(tags, { s02: { name: "ME", colour: "#1fa392" } });
});

// ---- camera
test("video: camera recipes start and end where they say, and shake is seeded by frame", () => {
  const s = V(0, 2, 0), d = V(0, 0, 1);
  const a = pushIn(s, d, 10, 4, 0), b = pushIn(s, d, 10, 4, 1);
  close(a.pos.z, 10); close(b.pos.z, 4); close(a.pos.y, 2.6);
  const o = orbit(s, 5, 0, Math.PI / 2, 1, 1); close(o.pos.x, 5); close(o.pos.z, 0, 1e-9);
  const cam = new THREE.PerspectiveCamera(), cam2 = new THREE.PerspectiveCamera(), shot = { ...a, shake: 0.2 };
  applyCamera(cam, shot, 12); applyCamera(cam2, shot, 12);
  assert.deepEqual(cam.position.toArray(), cam2.position.toArray());
  assert.notDeepEqual(cam.position.toArray(), a.pos.toArray());
  assert.equal(cam.near, 0.3); assert.equal(cam.fov, 45);
});

// ---- pose
test("video: poseAt is frame-pure (a frame looks the same whatever was rendered before)", () => {
  const rig = createRig(), fresh = createRig();
  const layers = [{ clip: clips.idle }, { clip: clips.wave, at: 0.5, fade: 0.3 }];
  for (const t of [3, 0.2, 5, 1]) poseAt(rig, layers, t);
  poseAt(fresh, layers, 1);
  const a = rig.jointPosition("RightHand"), b = fresh.jointPosition("RightHand");
  close(a.x, b.x, 1e-9); close(a.y, b.y, 1e-9); close(a.z, b.z, 1e-9);
  poseAt(rig, [{ clip: clips.idle }], 1);
  poseAt(fresh, [{ clip: clips.idle }], 1);
  close(rig.jointPosition("RightHand").y, fresh.jointPosition("RightHand").y, 1e-9, "a dropped layer stops");
});

test("video: groundRig puts the contacts on the ground and records where the character rests", () => {
  const rig = createRig(); rig.object.position.set(3, 7, -2);
  groundRig(rig, 1.5, FEET);
  const v = rig.jointPosition("LeftFoot");
  close(Math.min(v.y, rig.jointPosition("RightFoot").y) - 0.3, 1.5, 1e-6);
  const c = rig.object.userData.contact; assert.equal(c.ground, 1.5); close(c.x, 3, 0.6); close(c.z, -2, 0.6);
  groundRig(rig, 2, ON_SEAT); close(rig.jointPosition("LowerTorso").y - 0.35, 2, 1e-6);
});

// ---- surfaces
test("video: soft surfaces sink, hard ones don't; Roblox Material decides when the name says nothing", () => {
  assert.equal(surfaceOf("BigBed").name, "bed"); assert.equal(surfaceOf("Bed Base").name, "bed");
  assert.equal(surfaceOf("Bedroom").name, "hard", "a room is not a bed");
  assert.equal(surfaceOf("Sofa").sink, 0.3); assert.equal(surfaceOf("Floor", 1312).name, "fabric"); assert.equal(surfaceOf("Floor", 256).sink, 0);
  close(restOn(2, "pillow"), 1.55);
});

// ---- lighting
test("video: times of day, blends and the lighting rig", () => {
  assert.equal(daylight("NIGHT"), TIMES.night); assert.equal(daylight("nope"), TIMES.day); assert.equal(daylight(undefined), TIMES.day);
  const m0 = mixDaylight(TIMES.day, TIMES.night, 0), m1 = mixDaylight(TIMES.day, TIMES.night, 1);
  assert.equal(m0.top, TIMES.day.top); assert.equal(m1.top, TIMES.night.top); close(m1.sunIntensity, TIMES.night.sunIntensity);
  const L = createLighting(), focus = V(10, 0, 5);
  L.update({ time: TIMES.day, focus }); const bright = L.sun.intensity;
  L.update({ time: TIMES.day, overcast: 1, focus }); assert.ok(L.sun.intensity < bright * 0.4, "overcast dims the sun");
  close(L.sun.target.position.x, 10); assert.ok(L.sun.position.y > 0, "the sun is above the focus");
  const rig = createRig(); avatarAmbient(rig.object, 0.1);
  let lit = 0; rig.object.traverse((o) => { if (o.isMesh && o.material.isMeshStandardMaterial && o.material.emissive.r > 0) lit++; });
  assert.ok(lit > 0, "characters get a little self-light");
});

// ---- Roblox maps
const part = (o) => ({ cls: "Part", size: [4, 1, 2], cframe: { rot: I3, pos: [0, 0, 0] }, color: [0.5, 0.5, 0.5], material: 256, transparency: 0, reflectance: 0, shape: 1, ...o });

test("video: Roblox parts: Part.Shape, WedgePart slope facing Front (-Z), Cylinder along X", () => {
  const box = (g) => { g.computeBoundingBox(); return g.boundingBox.getSize(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)); };
  assert.deepEqual(box(partGeometry(part({}))), [4, 1, 2]);
  assert.deepEqual(box(partGeometry(part({ shape: 2, size: [6, 2, 2] }))), [6, 2, 2], "Cylinder: axis along X");
  assert.deepEqual(box(partGeometry(part({ shape: 0, size: [3, 3, 3] }))), [3, 3, 3], "Ball");
  const w = partGeometry(part({ cls: "WedgePart", size: [2, 2, 4] }));
  assert.deepEqual(box(w), [2, 2, 4]);
  const pos = w.attributes.position; let topZ = -Infinity;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.99) topZ = Math.max(topZ, pos.getZ(i));
  close(topZ, 2, 1e-6, "the wedge is full height only at the back (+Z)");
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.99) close(pos.getZ(i), 2, 1e-6);
});

test("video: Decal faces follow NormalId (Right +X, Top +Y, Back +Z, Left -X, Bottom -Y, Front -Z)", () => {
  const want = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]];
  want.forEach((n, face) => {
    const { g } = facePlane([2, 3, 4], face); g.computeVertexNormals();
    const nr = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, 0);
    assert.deepEqual(nr.toArray().map((x) => Math.round(x) + 0), n, `face ${face}`);
    g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3());
    const half = [1, 1.5, 2][n.findIndex((x) => x !== 0)];
    assert.ok(Math.abs(c.dot(new THREE.Vector3(...n)) - half) < 0.05, `face ${face} sits on the part's face`);
  });
});

test("video: a map merges plain parts per material, fits MeshParts to Size and exports solid colliders", () => {
  const mesh = { positions: new Float32Array([0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 8]), normals: new Float32Array(12), uvs: new Float32Array(8), indices: new Uint32Array([0, 1, 2, 0, 2, 3]), lods: [0, 2], faceCount: 2 };
  const data = {
    parts: [
      part({ name: "Floor", model: "House", size: [20, 1, 20], cframe: { rot: I3, pos: [0, -0.5, 0] } }),
      part({ name: "Wall", model: "House", size: [20, 8, 1], cframe: { rot: I3, pos: [0, 4, -10] } }),
      part({ name: "Window", material: 1568, transparency: 0.6, cframe: { rot: I3, pos: [0, 4, 10] } }),
      part({ name: "Ghost", transparency: 1 }),
      part({ name: "BigBed", cls: "MeshPart", mesh: 42, size: [4, 2, 6], material: 1312, cframe: { rot: I3, pos: [5, 1, 0] } }),
      part({ name: "Union", union: 1, model: "Arch", cframe: { rot: I3, pos: [-5, 1, 0] } }),
    ],
    lights: [{ cls: "PointLight", at: [0, 6, 0], rot: I3, color: [1, 0.9, 0.7], brightness: 1, range: 16, face: 1, angle: 90 }],
  };
  const map = buildRobloxMap(data, { meshes: { 42: mesh }, images: {} }, { skip: (p) => !!p.union });
  const meshes = map.group.children.filter((o) => o.isMesh);
  assert.ok(meshes.some((m) => m.name === "parts:256|1"), "Floor and Wall share one plastic mesh");
  assert.equal(meshes.filter((m) => m.name === "parts:256|1").length, 1);
  const bed = meshes.find((m) => m.name === "BigBed"); bed.geometry.computeBoundingBox();
  assert.deepEqual(bed.geometry.boundingBox.getSize(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)), [4, 2, 6], "MeshPart fitted to Size");
  assert.deepEqual(map.colliders.map((c) => c.name), ["House/Floor", "House/Wall", "BigBed"], "transparent parts and skipped unions are not solid");
  assert.equal(map.group.userData.colliders, map.colliders);
  const wall = map.find(/wall/i); close(wall.min.z, -10.5); close(wall.max.y, 8);
  assert.equal(map.names()[0][0], "House");
  assert.equal(map.group.children.filter((o) => o.isPointLight).length, 1);
  assert.ok(materialLook(1568).glass); assert.ok(materialLook(288).neon); assert.equal(materialLook(99999).rough, 0.75);
});

// ---- staging check (real Rapier)
test("video: the staging check finds a character inside a wall, floating, sunk, stiff on a bed, overlapping, and a camera in a wall", async () => {
  const R = await loadRapier(() => import("@dimforge/rapier3d-compat"));
  assert.equal(await loadRapier(() => { throw new Error("loaded twice"); }), R, "Rapier loads once");
  const data = { parts: [
    part({ name: "Floor", size: [60, 1, 60], cframe: { rot: I3, pos: [0, -0.5, 0] } }),
    part({ name: "Wall", size: [1, 10, 10], cframe: { rot: I3, pos: [10, 5, 0] } }),
    part({ name: "Bed", size: [6, 2, 4], material: 1312, cframe: { rot: I3, pos: [-10, 1, 0] } }),
  ], lights: [] };
  const root = new THREE.Group(), map = buildRobloxMap(data, { meshes: {}, images: {} }); root.add(map.group);
  const hidden = new THREE.Group(); hidden.visible = false; hidden.add(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshStandardMaterial())); hidden.position.set(0, 2, 6); root.add(hidden);
  const cast = new THREE.Group(); // characters live outside the probed world: they are checked, not colliders
  const at = (name, x, z, ground, contacts = FEET) => { const rig = createRig(); rig.object.position.set(x, 0, z); cast.add(rig.object); groundRig(rig, ground, contacts); return { name, rig }; };
  const ok = at("ok", 0, 0, 0), inWall = at("wall", 10, 0, 0), floating = at("floating", 0, -15, 1.5), sunk = at("sunk", 0, 15, -1), stiff = at("stiff", -10, 0, 2, ON_SEAT), soft = at("soft", -10, 1.4, 2 - 0.35, ON_SEAT);
  const twin = at("twin", 0.3, 0, 0);
  const probe = createProbe(R, root);
  assert.ok(probe.colliders >= 3);
  assert.equal(probe.solidAt(V(0, 2, 6)), null, "invisible things are not solid");
  const cam = new THREE.PerspectiveCamera(50, 9 / 16, 0.3, 2000); cam.position.set(0, 3, -30); cam.lookAt(0, 3, 0);
  const issues = probe.check(cam, [ok, inWall, floating, sunk, stiff, soft, twin]);
  const of = (who) => issues.filter((i) => i.who === who).map((i) => i.kind);
  assert.deepEqual(of("ok").filter((k) => k !== "overlap"), []);
  assert.ok(of("wall").includes("inside"));
  assert.ok(of("floating").includes("floating"));
  assert.ok(of("sunk").includes("sunk"));
  assert.ok(of("stiff").includes("stiff"), "perched exactly on a soft bed");
  assert.deepEqual(of("soft"), [], "sunk into the bed by its softness");
  assert.ok(issues.some((i) => i.kind === "overlap" && [i.who, i.what].sort().join() === "ok,twin"));
  cam.position.set(10, 5, 0);
  assert.ok(probe.check(cam, []).some((i) => i.kind === "camera-inside" && i.what === "Wall"));
  probe.free();
});

// ---- boards
test("video: panels redraw only when what they show changes (frame-pure boards)", () => {
  const made = []; setCanvasFactory((w, h) => { const c = mockCanvas(w); c.height = h; made.push(c); return c; });
  let draws = 0;
  const tv = panel(3.2, 1.8, 640, (g, W, H, key) => { draws++; g.fillText(key, W / 2, H / 2); });
  assert.equal(made[0].width, 640); assert.equal(made[0].height, 360); assert.ok(tv.userData.noCollide);
  assert.equal(tv.set("HELLO", 0.5), true); assert.equal(tv.set("HELLO", 0.501), false); assert.equal(tv.set("HELLO", 0.6), true); assert.equal(tv.set("BYE", 0.6), true);
  assert.equal(draws, 3);
  const b = banner(["CTF FINALS", "2026"], 6, 1.5); assert.ok(b.material.isMeshStandardMaterial, "banners are lit");
  const p = poster(null, 2, 3, { caption: "FAN CLUB", glow: true }); assert.ok(p.material.isMeshBasicMaterial);
  const s = standee(mockCanvas(100), { height: 5 }); assert.equal(s.children[0].geometry.parameters.height, 5);
  close(s.children[0].position.y, 2.55);
});

test("video: pictures are cover-fitted, and a missing image draws a grey box", () => {
  const f = coverFit(200, 100, 0, 0, 100, 100); assert.deepEqual(f, { x: -50, y: 0, w: 200, h: 100 });
  const c = mockCanvas(); const g = c.getContext();
  pic(g, null, 10, 20, 30, 40); assert.ok(c.calls.some((k) => k[0] === "fillRect" && k[1] === 10 && k[3] === 30));
  c.reset(); pic(g, { width: 50, height: 50 }, 0, 0, 100, 100, { round: true });
  assert.ok(c.calls.some((k) => k[0] === "arc")); assert.deepEqual(c.calls.find((k) => k[0] === "drawImage").slice(2), [0, 0, 100, 100]);
  c.reset(); const h = videoCard(g, { thumb: null, avatar: null, title: "T", channel: "C" }, 0, 0, 160);
  close(h, 90 + 32); assert.ok(c.calls.some((k) => k[0] === "fillText" && k[1] === "C ✓"));
});

test("video: loadImages loads by name and leaves failures out as null", async () => {
  class FakeImage { set src(v) { this.width = 1; queueMicrotask(() => (v.includes("bad") ? this.onerror() : this.onload())); } }
  const imgs = await loadImages({ a: "a.jpg", b: "bad.jpg" }, (f) => "brands/" + f, { Image: FakeImage });
  assert.ok(imgs.a instanceof FakeImage); assert.equal(imgs.b, null);
});

// ---- fixes from the videos' feedback logs
import { Plan, rect, circle, inside, intersects, layer, groundConflicts, lightsByLocation, compileStory, swallowingUnions } from "../src/video/index.js";

test("video: the layout plan keeps things off roads, out of each other, and lists forced overlaps", () => {
  assert.ok(intersects(rect(0, 0, 2, 2), rect(1.5, 0, 2, 2))); assert.ok(!intersects(rect(0, 0, 2, 2), rect(3, 0, 2, 2)));
  assert.ok(intersects(rect(0, 0, 2, 2), rect(2, 0, 2, 2)), "touching counts"); assert.ok(intersects(rect(0, 0, 10, 10), rect(0, 0, 1, 1)), "one inside the other");
  assert.ok(intersects(rect(0, 0, 4, 1, Math.PI / 4), circle(1, 1, 0.3)) === inside(rect(0, 0, 4, 1, Math.PI / 4), 1, 1));
  const plan = new Plan(), r = rng(3);
  plan.zone("road", rect(0, 0, 10, 200));
  const lot = plan.area("lot", rect(30, 0, 30, 30));
  assert.equal(plan.place("house", rect(10, 0, 12, 8)), false, "a house on the road is refused");
  assert.equal(plan.place("house", rect(30, 0, 10, 8)), true);
  const trees = plan.scatter(lot, { count: 5, radius: 1.5, gap: 4, rng: r, name: "tree" });
  for (const [x, z] of trees) { assert.ok(inside(lot, x, z)); assert.ok(!intersects(circle(x, z, 1.5), rect(30, 0, 10, 8)), "no tree in the house"); }
  assert.deepEqual(plan.along([-20, -5], [20, -5], 5).filter(([x]) => Math.abs(x) < 5.5), [], "no fence posts across the road");
  plan.place("shed", rect(0, 20, 4, 4), { force: true });
  assert.deepEqual(plan.conflicts(), ["shed overlaps road"]);
});

test("video: ground layers don't flicker (own height step and polygon offset; same-layer overlaps are listed)", () => {
  const plane = () => new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial());
  const root = new THREE.Group(), grass = layer(plane(), 0), road = layer(plane(), 2);
  root.add(grass, road);
  assert.equal(road.position.y, 0.08); assert.equal(road.material.polygonOffsetFactor, -2);
  assert.deepEqual(groundConflicts(root), []);
  const puddle = layer(plane(), 2); puddle.position.x = 5; root.add(puddle);
  assert.equal(groundConflicts(root).length, 1);
});

test("video: lamps are on only at the location the camera is in (render speed)", () => {
  const root = new THREE.Group(), a = new THREE.PointLight(), b = new THREE.SpotLight(), sun = new THREE.DirectionalLight();
  a.position.set(5, 8, 0); b.position.set(598, 8, 3); root.add(a, b, sun);
  const L = lightsByLocation(root, { room: V(0, 0, 0), school: V(600, 0, 0) });
  L.show("school"); assert.equal(a.visible, false); assert.equal(b.visible, true); assert.equal(sun.visible, true, "the sun is shared");
  L.show("nowhere"); assert.equal(a.visible, true);
});

test("video: story docs compile, and broken shots are caught before any voice or render time", () => {
  const md = `---\ntitle: T\nslug: t\nfps: 30\nsize: 1080x1920\n---\n### s01 · street\n> In this town, it rains.\n- captions: In this *town* | it rains\n- camera: crane\n- action: walk\n- emotion: flat\n### s02 · room\n> Hi mom!\n- captions: Hi mom and dad\n- say: Hai mama papa\n- faces: me=giddy\n- light: disco\n### s03 · room\n- camera: hold\n`;
  const audio = "## Voice\n- engine: chatterbox-js\n- gap: 0.45\n## Voices\n- mom: af_heart 1.1\n## Music\n- s01: goofy-piano\n- s03: none\n- s09: casio\n";
  const { story, errors, warnings } = compileStory(md, audio, { themes: ["goofy-piano"] });
  assert.equal(story.fps, 30); assert.equal(story.voice.gapSeconds, 0.45); assert.deepEqual(story.voice.chatterbox.voices.mom, { voice: "af_heart", pitch: 1.1 });
  assert.deepEqual(story.shots[0].captions[0], { text: "In this town", highlight: "town" });
  const has = (re) => assert.ok(errors.some((e) => re.test(e)), `expected ${re}: ${errors.join(" | ")}`);
  has(/s02: captions .* do not cover/); has(/s02: "say" has 3 words, the line 2/); has(/s02: face "giddy"/); has(/s02: light "disco"/);
  has(/s03: a silent shot needs/); has(/no shot "s09"/);
  assert.ok(!errors.some((e) => /theme "none"/.test(e)), "none is silence");
  assert.ok(!errors.some((e) => /^s01/.test(e)));
  assert.ok(warnings.some((w) => /s02: no emotion .* panic/.test(w)));
});

test("video: a Roblox desk-top union drawn as a box over a chair is left out (and reported); walls and dormers stay", () => {
  const turn = [0.643, 0, -0.766, 0, 1, 0, 0.766, 0, 0.643]; // the nasa desk is turned 50 degrees
  const chair = [part({ name: "Body", model: "GamingChair", size: [3.3, 3.4, 3], cframe: { rot: I3, pos: [-4, 3.1, 0] } }), part({ name: "Chair", model: "GamingChair", size: [3.1, 4.3, 3.8], cframe: { rot: I3, pos: [-4.5, 5.3, 0] } })];
  const desk = part({ cls: "UnionOperation", union: 7, name: "Union", model: "Desk", size: [13.2, 0.2, 12.2], cframe: { rot: turn, pos: [0, 4.2, 0] } });
  const lamp = part({ name: "Lamp", model: "Lamp", size: [1, 2, 1], cframe: { rot: I3, pos: [2, 5.3, 0] } }); // standing ON the desk: fine
  const dormer = part({ cls: "UnionOperation", union: 8, name: "Union", model: "Roof Window", size: [8, 4, 4], cframe: { rot: I3, pos: [30, 20, 0] } });
  const win = [part({ name: "Frame", model: "Window", size: [3, 3, 0.5], cframe: { rot: I3, pos: [30, 20, 0] } }), part({ name: "Sill", model: "Window", size: [3, 0.5, 0.6], cframe: { rot: I3, pos: [30, 18.5, 0] } })];
  const data = { parts: [...chair, desk, lamp, dormer, ...win], lights: [] };
  assert.deepEqual(swallowingUnions(data.parts), [desk]);
  assert.deepEqual(swallowingUnions([...chair.slice(0, 1), desk, lamp]), [], "one part poking through is not furniture");
  const map = buildRobloxMap(data, { meshes: {}, images: {} }, { warn: false });
  assert.equal(map.dropped.length, 1); assert.equal(map.dropped[0].part, desk);
  assert.ok(!map.colliders.some((c) => c.name === "Desk/Union"));
  const top = map.dropped[0].standIn; assert.ok(top, "trimmed to a stand-in");
  assert.ok(map.colliders.some((c) => c.name === "Desk/Union (trimmed)"));
  assert.ok(top.size[0] * top.size[2] > 0.3 * 13.2 * 12.2, "a big part of the top is kept");
  // no corner of the kept top lies inside a chair part's footprint
  const g = partGeometry(top).applyMatrix4(cframeToMatrix(top.cframe, new THREE.Matrix4())), pos = g.attributes.position;
  for (const p of chair) {
    const b = new THREE.Box3().setFromCenterAndSize(V(...p.cframe.pos), V(...p.size));
    for (let i = 0; i < pos.count; i++) assert.ok(!(pos.getX(i) > b.min.x + 0.01 && pos.getX(i) < b.max.x - 0.01 && pos.getZ(i) > b.min.z + 0.01 && pos.getZ(i) < b.max.z - 0.01), "the kept top clears the chair");
  }
  assert.equal(buildRobloxMap(data, { meshes: {}, images: {} }, { unions: "skip", warn: false }).dropped[0].standIn, null);
  assert.ok(map.colliders.some((c) => c.name === "Roof Window/Union"), "the dormer roof stays");
  assert.equal(buildRobloxMap(data, { meshes: {}, images: {} }, { unions: "box" }).dropped.length, 0);
});

test("video: a seated character isn't 'inside' its own chair, and captions over a watched face are caught", async () => {
  const R = await loadRapier(() => import("@dimforge/rapier3d-compat"));
  const data = { parts: [
    part({ name: "Floor", size: [40, 1, 40], cframe: { rot: I3, pos: [0, -0.5, 0] } }),
    part({ name: "Seat", model: "GamingChair", size: [2.4, 0.5, 2.4], cframe: { rot: I3, pos: [0, 1.75, 0] } }),
    part({ name: "Back", model: "GamingChair", size: [2.4, 4, 0.6], cframe: { rot: I3, pos: [0, 4, 0] } }),
  ], lights: [] };
  const root = new THREE.Group(); root.add(buildRobloxMap(data, { meshes: {}, images: {} }).group);
  const rig = createRig(); rig.object.position.set(0, 0, 0); groundRig(rig, 2, ON_SEAT);
  const standing = createRig(); standing.object.position.set(0, 0, 0); groundRig(standing, 0, FEET); // standing on the floor through the chair: wrong
  new THREE.Group().add(rig.object, standing.object); // placed in the scene (unplaced characters are skipped)
  const probe = createProbe(R, root);
  const cam = new THREE.PerspectiveCamera(50, 9 / 16, 0.3, 2000); cam.position.set(0, 4, 12); cam.lookAt(0, 3, 0);
  const seated = probe.check(cam, [{ name: "me", rig }]);
  assert.ok(!seated.some((i) => i.kind === "inside"), JSON.stringify(seated));
  assert.ok(probe.check(cam, [{ name: "ghost", rig: standing }]).some((i) => i.kind === "inside" && i.what.startsWith("GamingChair")), "standing in the chair still counts");
  // aim so the face sits low in the frame, in the caption band
  cam.lookAt(0, 6.5, 0);
  const caps = probe.check(cam, [{ name: "me", rig }], { captions: [0.6, 0.8] });
  assert.ok(caps.some((i) => i.kind === "caption-over-face"), JSON.stringify(caps));
  assert.ok(!probe.check(cam, [{ name: "me", rig }]).some((i) => i.kind === "caption-over-face"), "only when captions are given");
  probe.free();
});
