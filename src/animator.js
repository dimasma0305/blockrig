// BlockRig Animator: plays KeyframeSequence-style clips (modelled on Roblox Keyframe/Pose) on a rig.
//
// Clip: { name, length, loop, priority: "Idle"|"Movement"|"Action"|"Action2"|"Action3"|"Action4"|"Core",
//         keyframes: [{ t, poses: { Joint: { r: [x,y,z], ease, dir }, HumanoidRootPart: { p: [x,y,z] } } }],
//         markers: [{ t, name }] }
// A pose's ease/dir shape the move from its keyframe to the joint's next keyframe, as in Roblox.
// Within one priority tracks are weight-averaged; a higher priority is laid over the lower result by its
// total weight (max 1), per joint, so a clip only overrides the joints it keys. play()/stop() fade linearly.
import * as THREE from "three";

export const PRIORITY = { Core: -1, Idle: 0, Movement: 1, Action: 2, Action2: 3, Action3: 4, Action4: 5 };
// easing curves (TweenService-style); "In" curves are accelerating, Out = 1 - In(1 - t)
const IN = {
  Linear: (t) => t,
  Constant: () => 0,
  Cubic: (t) => t * t * t,
  Elastic: (t) => (t === 0 || t === 1 ? t : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))),
  Bounce: (t) => 1 - bounceOut(1 - t),
};
function bounceOut(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
export function ease(style, dir, t) {
  if (style === "Constant") return 0; // hold this keyframe until the next one
  const f = IN[style] || IN.Linear;
  if (dir === "Out") return 1 - f(1 - t);
  if (dir === "InOut") return t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2;
  return f(t); // In
}

const e2q = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] || 0, r[1] || 0, r[2] || 0, "YXZ"));

// A pose may give the joint rotation as Euler `r` (radians, YXZ, character axes) or quaternion `q` [x,y,z,w]
// (what an imported Pose.CFrame becomes), a position `p` (studs; on HumanoidRootPart it moves the whole body,
// on any other joint it is the translation part of the Motor6D Transform), and `weight` (Pose.Weight, default 1).
function compile(clip) {
  if (clip._compiled) return clip._compiled;
  const rot = {}, pos = [], offs = {};
  const kfs = clip.keyframes.slice().sort((a, b) => a.t - b.t);
  kfs.forEach((kf) => {
    for (const j in kf.poses) {
      const p = kf.poses[j], k = { t: kf.t, ease: p.ease || "Cubic", dir: p.dir || "InOut", w: p.weight ?? 1 };
      if (p.q || p.r) (rot[j] = rot[j] || []).push(Object.assign({ q: p.q ? new THREE.Quaternion().fromArray(p.q).normalize() : e2q(p.r) }, k));
      if (p.p) {
        const key = Object.assign({ v: new THREE.Vector3().fromArray(p.p) }, k);
        if (j === "HumanoidRootPart") pos.push(key); else (offs[j] = offs[j] || []).push(key);
      }
    }
  });
  const length = clip.length || (kfs.length ? kfs[kfs.length - 1].t : 0);
  return (clip._compiled = { rot, pos, offs, length, priority: PRIORITY[clip.priority || "Action"] ?? 2, loop: clip.loop !== false });
}

// find the segment around time t in a key list and the eased blend factor
function seg(keys, t) {
  if (t <= keys[0].t) return [keys[0], keys[0], 0];
  const last = keys[keys.length - 1];
  if (t >= last.t) return [last, last, 0];
  let i = 0; while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1], span = b.t - a.t;
  return [a, b, span > 0 ? ease(a.ease, a.dir, (t - a.t) / span) : 1];
}
// sample a key list: returns the interpolated Pose.Weight and writes the value into out
const sampleQ = (keys, t, out) => { const [a, b, f] = seg(keys, t); out.copy(a.q).slerp(b.q, f); return a.w + (b.w - a.w) * f; };
const sampleV = (keys, t, out) => { const [a, b, f] = seg(keys, t); out.copy(a.v).lerp(b.v, f); return a.w + (b.w - a.w) * f; };

export class Animator {
  constructor(rig) { this.rig = rig; this.tracks = []; this.listeners = []; this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); }
  // play(clip, { fade = 0.1, weight = 1, speed = 1 }) -> track; replaces a playing copy of the same clip
  play(clip, o = {}) {
    const c = compile(clip);
    let tr = this.tracks.find((x) => x.clip === clip);
    if (!tr) { tr = { clip, c, time: 0, weight: 0 }; this.tracks.push(tr); }
    else tr.time = 0;
    tr.target = o.weight ?? 1; tr.fade = o.fade ?? 0.1; tr.speed = o.speed ?? 1; tr.lastT = -1;
    return tr;
  }
  stop(clipOrName, fade = 0.1) {
    this.tracks.forEach((tr) => { if (!clipOrName || tr.clip === clipOrName || tr.clip.name === clipOrName) { tr.target = 0; tr.fade = fade; } });
  }
  isPlaying(name) { return this.tracks.some((tr) => tr.clip.name === name && tr.target > 0); }
  onMarker(fn) { this.listeners.push(fn); }

  update(dt) {
    const rig = this.rig;
    // advance time and weights
    for (const tr of this.tracks) {
      const prev = tr.time; tr.time += dt * tr.speed;
      const L = tr.c.length;
      if (L > 0 && tr.time >= L) { if (tr.c.loop) tr.time %= L; else { tr.time = L; if (tr.target > 0) { tr.target = 0; tr.fade = tr.fade || 0.1; } } }
      (tr.clip.markers || []).forEach((m) => {
      const hit = tr.time >= prev ? m.t > prev && m.t <= tr.time : m.t > prev || m.t <= tr.time;
      if (!hit || tr.target <= 0) return;
      // "face:<expression>" markers change the rig's live face
      if (m.name.startsWith("face:") && rig.setExpression) rig.setExpression(m.name.slice(5), m.fade !== undefined ? { fade: m.fade } : undefined);
      this.listeners.forEach((fn) => fn(m.name, tr.clip));
    });
      const step = tr.fade > 0 ? dt / tr.fade : 1;
      tr.weight += Math.max(-step, Math.min(step, tr.target - tr.weight));
    }
    this.tracks = this.tracks.filter((tr) => tr.target > 0 || tr.weight > 1e-4);
    const levels = [...new Set(this.tracks.map((tr) => tr.c.priority))].sort((a, b) => a - b);

    rig.resetPose();
    const joints = new Set(); this.tracks.forEach((tr) => Object.keys(tr.c.rot).forEach((j) => joints.add(j)));
    const result = new THREE.Quaternion(), lvlQ = new THREE.Quaternion();
    for (const j of joints) {
      result.identity();
      for (const L of levels) {
        let wsum = 0;
        for (const tr of this.tracks) {
          if (tr.c.priority !== L || !tr.c.rot[j] || tr.weight <= 0) continue;
          const w = tr.weight * sampleQ(tr.c.rot[j], tr.time, this._q); // track weight x Pose.Weight
          if (w <= 0) continue;
          if (wsum === 0) lvlQ.copy(this._q); else lvlQ.slerp(this._q, w / (wsum + w));
          wsum += w;
        }
        if (wsum > 0) result.slerp(lvlQ, Math.min(1, wsum));
      }
      rig.setJointQuat(j, result);
    }
    // root offset (HumanoidRootPart position keys)
    const off = new THREE.Vector3(), lv = new THREE.Vector3();
    for (const L of levels) {
      let wsum = 0; lv.set(0, 0, 0);
      for (const tr of this.tracks) {
        if (tr.c.priority !== L || !tr.c.pos.length || tr.weight <= 0) continue;
        const w = tr.weight * sampleV(tr.c.pos, tr.time, this._v); lv.addScaledVector(this._v, w); wsum += w;
      }
      if (wsum > 0) off.lerp(lv.divideScalar(wsum), Math.min(1, wsum));
    }
    rig.setRootOffset(off.x, off.y, off.z);
    // per-joint Transform translation (imported Pose.CFrame positions)
    if (rig.setJointOffset) {
      const offJoints = new Set(); this.tracks.forEach((tr) => Object.keys(tr.c.offs).forEach((j) => offJoints.add(j)));
      for (const j of offJoints) {
        off.set(0, 0, 0);
        for (const L of levels) {
          let wsum = 0; lv.set(0, 0, 0);
          for (const tr of this.tracks) {
            if (tr.c.priority !== L || !tr.c.offs[j] || tr.weight <= 0) continue;
            const w = tr.weight * sampleV(tr.c.offs[j], tr.time, this._v); if (w <= 0) continue;
            lv.addScaledVector(this._v, w); wsum += w;
          }
          if (wsum > 0) off.lerp(lv.divideScalar(wsum), Math.min(1, wsum));
        }
        rig.setJointOffset(j, off.x, off.y, off.z);
      }
    }
    if (rig.updateFace) rig.updateFace(dt);
  }
}
