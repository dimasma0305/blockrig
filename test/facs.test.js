import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { parseFacs, facsWeights, facsBoneOffsets, FACS_CODES, FACE_CONTROLS, createRig, Animator, keyframeSequenceToClip, parseRbxm, lodIndices } from "../src/index.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";

// Build a FACS block in the head-mesh layout: names, six quantized matrices (rows = bones,
// cols = controls + 2-pose + 3-pose correctives, row-major), then the corrective index lists.
function facsBlock({ bones, codes, two = [], three = [], p, version = 2 }) {
  const rows = bones.length, cols = codes.length + two.length + three.length;
  const str = (list) => Buffer.from(list.map((s) => s + "\0").join(""), "latin1");
  const bn = str(bones), cn = str(codes), mats = [];
  for (const axis of [0, 1, 2, 3, 4, 5]) {
    const vals = new Float32Array(rows * cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) vals[r * cols + c] = axis < 3 ? (p[r]?.[c]?.[axis] ?? 0) : 0;
    const head = Buffer.alloc(10); head.writeUInt16LE(version, 0); head.writeUInt32LE(rows, 2); head.writeUInt32LE(cols, 6);
    if (version === 1) { const b = Buffer.alloc(vals.length * 4); vals.forEach((v, i) => b.writeFloatLE(v, i * 4)); mats.push(head, b); }
    else {
      let mn = Math.min(0, ...vals), mx = Math.max(0, ...vals); if (mx === mn) mx = mn + 1;
      const mm = Buffer.alloc(8); mm.writeFloatLE(mn, 0); mm.writeFloatLE(mx, 4);
      const b = Buffer.alloc(vals.length * 2); vals.forEach((v, i) => b.writeUInt16LE(Math.round(((v - mn) / (mx - mn)) * 65535), i * 2));
      mats.push(head, mm, b);
    }
  }
  const q = Buffer.concat(mats), t2 = Buffer.alloc(two.length * 4), t3 = Buffer.alloc(three.length * 6);
  two.forEach(([a, b], i) => { t2.writeUInt16LE(a, i * 4); t2.writeUInt16LE(b, i * 4 + 2); });
  three.forEach(([a, b, c], i) => { t3.writeUInt16LE(a, i * 6); t3.writeUInt16LE(b, i * 6 + 2); t3.writeUInt16LE(c, i * 6 + 4); });
  const h = Buffer.alloc(24); h.writeUInt32LE(bn.length, 0); h.writeUInt32LE(cn.length, 4); h.writeUInt32LE(q.length, 8); h.writeUInt32LE(0, 12); h.writeUInt32LE(t2.length, 16); h.writeUInt32LE(t3.length, 20);
  return new Uint8Array(Buffer.concat([h, bn, cn, q, t2, t3]));
}

// two face bones: "jaw" moves down with JawDrop, "lid" moves down with LeftEyeClosed; a corrective for both
const block = () => facsBlock({
  bones: ["jaw", "lid"], codes: ["c_JD", "l_EC"], two: [[0, 1]],
  p: [[[0, -0.2, 0.05], [0, 0, 0], [0.01, 0, 0]], [[0, 0, 0], [0, -0.06, 0], [0, 0.02, 0]]],
});

test("parseFacs reads names, quantized matrices and correctives", () => {
  for (const version of [1, 2]) {
    const f = parseFacs(facsBlock({ bones: ["a", "b"], codes: ["c_JD", "l_EC", "r_EC"], two: [[1, 2]], three: [[0, 1, 2]], p: [[[0, -0.1, 0]]], version }));
    assert.deepEqual(f.bones, ["a", "b"]);
    assert.deepEqual(f.controls, ["JawDrop", "LeftEyeClosed", "RightEyeClosed"]);
    assert.equal(f.rows, 2); assert.equal(f.cols, 5);
    assert.deepEqual(f.twoPose, [[1, 2]]); assert.deepEqual(f.threePose, [[0, 1, 2]]);
    assert.ok(Math.abs(f.py[0] + 0.1) < 1e-4, `version ${version}: bone a, JawDrop, y`);
    assert.ok(Math.abs(f.py[1]) < 1e-4);
  }
  assert.equal(FACE_CONTROLS.length, 50);
  assert.equal(new Set(FACE_CONTROLS).size, 50);
  assert.equal(FACS_CODES.r_LCP, "RightLipCornerPuller");
});

test("FACS weights: controls clamp to 0..1, correctives are the product of their controls", () => {
  const f = parseFacs(block());
  assert.deepEqual([...facsWeights(f, { JawDrop: 2, LeftEyeClosed: 0.5 })], [1, 0.5, 0.5]);
  assert.deepEqual([...facsWeights(f, { JawDrop: -1, LeftEyeClosed: 0.5 })], [0, 0.5, 0]);
  const off = facsBoneOffsets(f, { JawDrop: 1, LeftEyeClosed: 1 });
  assert.ok(Math.abs(off[1] + 0.2) < 1e-4, "jaw down");
  assert.ok(Math.abs(off[0] - 0.01) < 1e-4, "plus the corrective on x");
  assert.ok(Math.abs(off[4] - (-0.06 + 0.02)) < 1e-4, "lid down, corrected");
});

// a dynamic head mesh: a box whose bottom half is skinned to "jaw" and top half to "lid"
function dynamicHead() {
  const g = new THREE.BoxGeometry(1.2, 1.2, 1.2, 1, 2, 1), idx = g.index.array, n = g.attributes.position.count;
  const bones = ["Root", "Head", "DynamicHead", "jaw", "lid"].map((name, i) => ({ name, parent: i ? (i > 2 ? 2 : i - 1) : -1, cframe: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 0, 0] } }));
  const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) { const y = g.attributes.position.getY(v); skinIndex[v * 4] = y < 0 ? 3 : y > 0 ? 4 : 2; skinWeight[v * 4] = 1; }
  return { positions: g.attributes.position.array, normals: g.attributes.normal.array, uvs: g.attributes.uv.array, indices: Uint32Array.from(idx), faceCount: idx.length / 3, vertexCount: n, lods: [0, 0], bones, skinIndex, skinWeight, facs: block() };
}

test("dynamic head: FaceControls deform the head, and a shared parsed mesh stays untouched", () => {
  const mesh = dynamicHead(), original = Float32Array.from(mesh.positions);
  const rig = createRig({ bodyColors: { HeadColor3: "#8d5a3b" } });
  rig.setHead(mesh, { attachments: { NeckRigAttachment: [0, -0.6, 0] } });
  assert.equal(rig.dynamicHead, true);
  assert.ok(rig.parts.Head.geometry.index.count > 0, "a [0, 0] LOD table still draws the whole mesh");
  const pos = rig.parts.Head.geometry.attributes.position, rest = Float32Array.from(pos.array);
  const bottom = [...Array(pos.count).keys()].filter((v) => original[v * 3 + 1] < 0), top = [...Array(pos.count).keys()].filter((v) => original[v * 3 + 1] > 0);
  rig.faceControls.JawDrop = 1;
  assert.equal(rig.applyFaceControls(), true);
  for (const v of bottom) assert.ok(Math.abs(pos.array[v * 3 + 1] - (rest[v * 3 + 1] - 0.2)) < 1e-4, "jaw vertices move down 0.2");
  for (const v of top) assert.ok(Math.abs(pos.array[v * 3 + 1] - rest[v * 3 + 1]) < 1e-6, "the rest stay");
  assert.equal(rig.applyFaceControls(), false, "no change, no work");
  rig.faceControls.JawDrop = 0; rig.applyFaceControls();
  assert.ok(pos.array.every((x, i) => Math.abs(x - rest[i]) < 1e-6), "back to rest");
  assert.deepEqual([...mesh.positions], [...original], "the parsed mesh is not modified");
  // a second rig from the same parsed mesh is independent
  const rig2 = createRig({}); rig2.setHead(mesh, { attachments: { NeckRigAttachment: [0, -0.6, 0] } });
  rig2.faceControls.LeftEyeClosed = 1; rig2.applyFaceControls();
  assert.ok(pos.array.every((x, i) => Math.abs(x - rest[i]) < 1e-6), "rig 1 unaffected by rig 2");
  assert.equal(lodIndices({ lods: [0, 0], faceCount: 2, indices: new Uint32Array(6) }, 0).length, 6);
});

test("face animation: FaceControls NumberPoses import and play through the Animator", () => {
  const S = 0x01, F = 0x04, E = 0x12, CF = 0x10, D = 0x05, B = 0x02, I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const np = (name, v) => ({ className: "NumberPose", props: { Name: [S, name], Value: [D, v], EasingStyle: [E, 0], EasingDirection: [E, 0], Weight: [F, 1] } });
  const kf = (t, jaw) => ({ className: "Keyframe", props: { Name: [S, "Keyframe"], Time: [F, t] }, children: [
    { className: "Pose", props: { Name: [S, "HumanoidRootPart"], CFrame: [CF, { rot: I3, pos: [0, 0, 0] }], Weight: [F, 0], EasingStyle: [E, 0], EasingDirection: [E, 0] }, children: [
      { className: "Pose", props: { Name: [S, "Head"], CFrame: [CF, { rot: I3, pos: [0, 0, 0] }], Weight: [F, 0], EasingStyle: [E, 0], EasingDirection: [E, 0] }, children: [
        { className: "Folder", props: { Name: [S, "FaceControls"] }, children: [np("JawDrop", jaw), np("LeftEyeClosed", 1)] },
      ] },
    ] },
  ] });
  const ks = { className: "KeyframeSequence", props: { Name: [S, "Talk"], Loop: [B, true], Priority: [E, 2] }, children: [kf(0, 0), kf(1, 0.8)] };
  const clip = keyframeSequenceToClip(parseRbxm(writeRbxm([ks])));
  assert.deepEqual(Object.keys(clip.keyframes[1].faces).sort(), ["JawDrop", "LeftEyeClosed"]);
  assert.ok(Math.abs(clip.keyframes[1].faces.JawDrop.v - 0.8) < 1e-9, "NumberPose.Value is a double");

  const rig = createRig({}); rig.setHead(dynamicHead(), { attachments: { NeckRigAttachment: [0, -0.6, 0] } });
  const an = new Animator(rig), neckRest = rig.neck.quaternion.clone();
  an.play(clip, { fade: 0 }); an.update(0.5);
  assert.ok(Math.abs(rig.faceControls.JawDrop - 0.4) < 1e-6, "linear between 0 and 0.8");
  assert.equal(rig.faceControls.LeftEyeClosed, 1);
  // a weight-0 Head pose doesn't move the neck
  assert.ok(rig.neck.quaternion.angleTo(neckRest) < 1e-9);
  an.stop(clip, 0); an.update(0.01);
  assert.equal(rig.faceControls.JawDrop, 0, "controls the animation stops driving go back to 0");
});
