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
  const rot = {}, pos = [], offs = {}, faces = {};
  const kfs = clip.keyframes.slice().sort((a, b) => a.t - b.t);
  kfs.forEach((kf) => {
    // FaceControls keys (dynamic heads): { faces: { JawDrop: { v, ease, dir, weight } } } or plain numbers
    for (const n in kf.faces || {}) {
      const f = kf.faces[n], k = typeof f === "number" ? { v: f } : f;
      (faces[n] = faces[n] || []).push({ t: kf.t, v: k.v ?? 0, ease: k.ease || "Linear", dir: k.dir || "In", w: k.weight ?? 1 });
    }
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
  return (clip._compiled = { rot, pos, offs, faces, length, priority: PRIORITY[clip.priority || "Action"] ?? 2, loop: clip.loop !== false });
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
const sampleN = (keys, t) => { const [a, b, f] = seg(keys, t); return [a.v + (b.v - a.v) * f, a.w + (b.w - a.w) * f]; };

/** A tiny event, like RBXScriptSignal: `connect(fn)` returns `{ disconnect() }`. */
export class Signal {
  constructor() { this._fns = []; }
  connect(fn) { this._fns.push(fn); return { disconnect: () => { this._fns = this._fns.filter((f) => f !== fn); } }; }
  once(fn) { const c = this.connect((...a) => { c.disconnect(); fn(...a); }); return c; }
  fire(...args) { for (const f of this._fns.slice()) f(...args); }
}

/**
 * One clip loaded on an Animator, like Roblox's AnimationTrack. Get one from `animator.loadAnimation(clip)`
 * (not playing yet) or `animator.play(clip)`.
 *   play(fadeTime = 0.1, weight = 1, speed = 1), stop(fadeTime = 0.1), adjustSpeed(speed), adjustWeight(weight, fadeTime)
 *   timePosition (settable), length, looped, priority (settable), speed, isPlaying, weightCurrent, weightTarget
 *   getTimeOfKeyframe(name), getMarkerReachedSignal(name)
 *   events: stopped (stop() called or a non-looped track reached its end), ended (fully faded out),
 *           didLoop, keyframeReached(name)
 */
export class AnimationTrack {
  constructor(animator, clip) {
    this.animator = animator; this.clip = clip; this.c = compile(clip);
    this.time = 0; this.weight = 0; this.target = 0; this.fade = 0.1; this.speed = 1; this.rate = Infinity; this.isPlaying = false;
    this._looped = undefined; this._priority = undefined; this._markers = new Map(); this._ended = false;
    this.stopped = new Signal(); this.ended = new Signal(); this.didLoop = new Signal(); this.keyframeReached = new Signal();
  }
  get name() { return this.clip.name; }
  get length() { return this.c.length; }
  get looped() { return this._looped ?? this.c.loop; }
  set looped(v) { this._looped = !!v; }
  get priority() { return this._priority ?? this.clip.priority ?? "Action"; }
  set priority(p) { if (!(p in PRIORITY)) throw new Error(`blockrig: unknown priority "${p}"`); this._priority = p; }
  get level() { return PRIORITY[this.priority] ?? 2; }
  get timePosition() { return this.time; }
  /** Jump to a time (clamped to 0..length). Markers between the old and new time don't fire. */
  set timePosition(t) { const L = this.length; this.time = L > 0 ? Math.max(0, Math.min(L, +t || 0)) : 0; }
  get weightCurrent() { return this.weight; }
  get weightTarget() { return this.target; }

  play(fadeTime = 0.1, weight = 1, speed = 1) {
    const an = this.animator;
    if (!an.tracks.includes(this)) an.tracks.push(this);
    this.time = speed < 0 ? this.length : 0;
    this.speed = speed; this.isPlaying = true; this._ended = false; this._fadeTo(weight, fadeTime);
    return this;
  }
  stop(fadeTime = 0.1) {
    this._fadeTo(0, fadeTime);
    if (this.isPlaying) { this.isPlaying = false; this.stopped.fire(); }
    return this;
  }
  /** Playback speed; negative plays backwards. */
  adjustSpeed(speed = 1) { this.speed = speed; return this; }
  /** Fade the weight to `weight` over `fadeTime` seconds. */
  adjustWeight(weight = 1, fadeTime = 0.1) { this._fadeTo(weight, fadeTime); return this; }
  // fadeTime is how long the weight takes to get from where it is now to the target, as in Roblox
  _fadeTo(weight, fadeTime) { this.target = weight; this.fade = fadeTime; this.rate = fadeTime > 0 ? Math.abs(weight - this.weight) / fadeTime : Infinity; }
  /** The time of the first keyframe with this name (a Keyframe.Name other than "Keyframe"). */
  getTimeOfKeyframe(name) {
    const k = (this.clip.markers || []).find((m) => m.kind === "keyframe" && m.name === name) || this.clip.keyframes.find((x) => x.name === name);
    if (!k) throw new Error(`blockrig: no keyframe named "${name}" in ${this.clip.name}`);
    return k.t;
  }
  /** Fires with the marker's value each time a KeyframeMarker with this name is passed. */
  getMarkerReachedSignal(name) { let s = this._markers.get(name); if (!s) this._markers.set(name, (s = new Signal())); return s; }

  // advance time by dt; returns [previous time, whether it wrapped]
  _advance(dt) {
    const prev = this.time, L = this.length; let wrapped = false;
    this.time += dt * this.speed;
    if (L > 0) {
      if (this.looped) {
        if (this.time >= L || this.time < 0) {
          const loops = Math.floor(this.time / L); this.time -= loops * L; wrapped = true;
          for (let i = 0; i < Math.abs(loops); i++) this.didLoop.fire();
        }
      } else if (this.time >= L || this.time < 0) {
        this.time = this.time >= L ? L : 0;
        if (this.isPlaying) this.stop(this.fade || 0.1);
      }
    } else this.time = 0;
    return [prev, wrapped];
  }
}

export class Animator {
  constructor(rig) { this.rig = rig; this.tracks = []; this.listeners = []; this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._faces = new Set(); }
  /** A track for this clip, not playing yet (Animator:LoadAnimation). */
  loadAnimation(clip) { return new AnimationTrack(this, clip); }
  /** Play a clip: { fade = 0.1, weight = 1, speed = 1 } -> its track. Playing a clip again restarts its track. */
  play(clip, o = {}) {
    const tr = this.tracks.find((x) => x.clip === clip) || this.loadAnimation(clip);
    return tr.play(o.fade ?? 0.1, o.weight ?? 1, o.speed ?? 1);
  }
  /** Stop tracks by clip or name (all tracks when omitted). */
  stop(clipOrName, fade = 0.1) {
    this.tracks.forEach((tr) => { if (!clipOrName || tr.clip === clipOrName || tr.clip.name === clipOrName) tr.stop(fade); });
  }
  isPlaying(name) { return this.tracks.some((tr) => tr.clip.name === name && tr.isPlaying); }
  /** Tracks that are playing (Animator:GetPlayingAnimationTracks). */
  getPlayingAnimationTracks() { return this.tracks.filter((tr) => tr.isPlaying); }
  /** Listen to every marker and named keyframe on every track: fn(name, clip, value). */
  onMarker(fn) { this.listeners.push(fn); }

  update(dt) {
    const rig = this.rig;
    // advance time, fire markers and events, fade weights
    for (const tr of this.tracks.slice()) {
      const wasPlaying = tr.isPlaying, [prev, wrapped] = tr._advance(dt), now = tr.time, back = dt * tr.speed < 0;
      const ms = tr._sorted || (tr._sorted = (tr.clip.markers || []).slice().sort((a, b) => a.t - b.t));
      const order = back ? ms.slice().reverse() : ms;
      const seq = wrapped ? (back ? [...order.filter((m) => m.t < prev), ...order.filter((m) => m.t >= now)] : [...order.filter((m) => m.t > prev), ...order.filter((m) => m.t <= now)]) : order;
      if (wasPlaying && dt !== 0) for (const m of seq) {
        const hit = back ? (wrapped ? m.t < prev || m.t >= now : m.t >= now && m.t < prev) : (wrapped ? m.t > prev || m.t <= now : m.t > prev && m.t <= now);
        if (!hit) continue;
        // "face:<expression>" markers change the rig's live face
        if (m.name.startsWith("face:") && rig.setExpression) rig.setExpression(m.name.slice(5), m.fade !== undefined ? { fade: m.fade } : undefined);
        if (m.kind === "keyframe") tr.keyframeReached.fire(m.name);
        else { const s = tr._markers.get(m.name); if (s) s.fire(m.value ?? ""); }
        this.listeners.forEach((fn) => fn(m.name, tr.clip, m.value));
      }
      const step = tr.rate === Infinity ? Infinity : tr.rate * Math.abs(dt);
      tr.weight += Math.max(-step, Math.min(step, tr.target - tr.weight));
    }
    this.tracks = this.tracks.filter((tr) => {
      if (tr.target > 0 || tr.weight > 1e-4) return true;
      tr.weight = 0;
      if (tr.isPlaying) { tr.isPlaying = false; tr.stopped.fire(); }
      if (!tr._ended) { tr._ended = true; tr.ended.fire(); }
      return false;
    });
    const levels = [...new Set(this.tracks.map((tr) => tr.level))].sort((a, b) => a - b);
    rig.resetPose();
    const joints = new Set(); this.tracks.forEach((tr) => Object.keys(tr.c.rot).forEach((j) => joints.add(j)));
    const result = new THREE.Quaternion(), lvlQ = new THREE.Quaternion();
    for (const j of joints) {
      result.identity();
      for (const L of levels) {
        let wsum = 0;
        for (const tr of this.tracks) {
          if (tr.level !== L || !tr.c.rot[j] || tr.weight <= 0) continue;
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
        if (tr.level !== L || !tr.c.pos.length || tr.weight <= 0) continue;
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
            if (tr.level !== L || !tr.c.offs[j] || tr.weight <= 0) continue;
            const w = tr.weight * sampleV(tr.c.offs[j], tr.time, this._v); if (w <= 0) continue;
            lv.addScaledVector(this._v, w); wsum += w;
          }
          if (wsum > 0) off.lerp(lv.divideScalar(wsum), Math.min(1, wsum));
        }
        rig.setJointOffset(j, off.x, off.y, off.z);
      }
    }
    // FaceControls (dynamic heads): blended like joints, per priority level, from 0; controls the animation
    // stops driving go back to 0
    if (rig.faceControls) {
      const fc = rig.faceControls, now = new Set();
      this.tracks.forEach((tr) => Object.keys(tr.c.faces).forEach((n) => now.add(n)));
      for (const n of this._faces) if (!now.has(n)) fc[n] = 0;
      for (const n of now) {
        let val = 0;
        for (const L of levels) {
          let wsum = 0, acc = 0;
          for (const tr of this.tracks) {
            if (tr.level !== L || !tr.c.faces[n] || tr.weight <= 0) continue;
            const [x, pw] = sampleN(tr.c.faces[n], tr.time), w = tr.weight * pw; if (w <= 0) continue;
            acc += x * w; wsum += w;
          }
          if (wsum > 0) val += (acc / wsum - val) * Math.min(1, wsum);
        }
        fc[n] = val;
      }
      this._faces = now;
    }
    if (rig.updateFace) rig.updateFace(dt);
  }
}
