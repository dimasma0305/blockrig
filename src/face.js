// Procedural faces: an expression is a set of numeric parameters (brows, eyes, mouth, extras) drawn onto a
// square canvas in a simple ink-decal style. Faces blend smoothly between expressions, blink on their own,
// look around and can "talk". The canvas can be wrapped onto a BlockRig head or shown as a decal on any head.
// All artwork is generated here; no external images are used.

/** Every parameter and its resting value. Ranges are noted; values in between blend smoothly. */
export const FACE_DEFAULTS = Object.freeze({
  eyeOpen: 1, // 0 closed .. 1 open
  eyeSize: 1, // 0.6 .. 1.5
  squint: 0, // 0 .. 1 flattens the lower half of the eyes (smiling eyes)
  whites: 0, // 0 solid ink eyes .. 1 white eyes with a small pupil (shock)
  lookX: 0, lookY: 0, // -1 .. 1 where the eyes look
  wink: 0, // 0 .. 1 closes the right eye into an arc
  wince: 0, // 0 .. 1 squeezed ">" "<" eyes
  ko: 0, // 0 .. 1 "x" eyes
  brows: 1, // 0 hidden .. 1 drawn
  browAngle: 0, // -1 worried (inner ends up) .. 1 angry (inner ends down)
  browY: 0, // -1 low .. 1 raised
  mouthCurve: 0.3, // -1 frown .. 1 smile
  mouthOpen: 0, // 0 closed line .. 1 wide open
  mouthWidth: 0.8, // 0.3 .. 1.3
  mouthSkew: 0, // -1 .. 1 lifts one corner (smirk)
  teeth: 0, tongue: 0, // 0 .. 1
  blush: 0, sweat: 0, tears: 0, // 0 .. 1
});

/** Built-in expressions (only the parameters that differ from FACE_DEFAULTS). */
export const EXPRESSIONS = Object.freeze({
  neutral: { mouthCurve: 0.08, mouthWidth: 0.6 },
  happy: { mouthCurve: 0.85, mouthWidth: 0.9, squint: 0.35, browY: 0.15 },
  grin: { mouthCurve: 0.9, mouthOpen: 0.45, teeth: 1, mouthWidth: 1, squint: 0.4, browY: 0.1 },
  laugh: { mouthCurve: 0.95, mouthOpen: 0.95, teeth: 1, tongue: 1, mouthWidth: 1.05, eyeOpen: 0.25, squint: 1, browY: 0.35 },
  smug: { mouthCurve: 0.45, mouthWidth: 0.7, mouthSkew: 0.8, squint: 0.5, browAngle: 0.2, browY: -0.1 },
  wink: { mouthCurve: 0.75, mouthWidth: 0.85, wink: 1, browY: 0.2, mouthSkew: 0.3 },
  determined: { browAngle: 0.65, squint: 0.3, mouthCurve: -0.1, mouthWidth: 0.55 },
  angry: { browAngle: 1, squint: 0.35, mouthCurve: -0.55, mouthWidth: 0.7, browY: -0.2 },
  furious: { browAngle: 1, eyeSize: 1.1, mouthCurve: -0.6, mouthOpen: 0.55, teeth: 1, mouthWidth: 1, browY: -0.3 },
  roar: { browAngle: 0.9, eyeSize: 1.15, mouthOpen: 1, teeth: 1, tongue: 1, mouthWidth: 1.2, mouthCurve: -0.15, browY: -0.2 },
  shocked: { eyeSize: 1.35, whites: 1, browY: 0.6, mouthOpen: 0.75, mouthCurve: 0, mouthWidth: 0.45 },
  scared: { eyeSize: 1.2, whites: 0.8, browAngle: -0.85, browY: 0.35, mouthCurve: -0.55, mouthOpen: 0.25, mouthWidth: 0.6, sweat: 1 },
  sad: { browAngle: -0.9, mouthCurve: -0.75, eyeOpen: 0.8, mouthWidth: 0.6, tears: 0.7, lookY: 0.4 },
  hurt: { wince: 1, browAngle: -0.5, mouthCurve: -0.45, mouthOpen: 0.45, teeth: 1, mouthWidth: 0.8, sweat: 0.6 },
  sleepy: { eyeOpen: 0.15, browY: -0.15, mouthCurve: 0, mouthOpen: 0.2, mouthWidth: 0.35, browAngle: -0.2 },
  embarrassed: { blush: 1, mouthCurve: 0.35, squint: 0.3, sweat: 0.6, browAngle: -0.35, lookX: 0.6, mouthWidth: 0.55 },
  dazed: { ko: 1, mouthCurve: -0.25, mouthOpen: 0.3, tongue: 0.8, mouthSkew: -0.5, brows: 0 },
});

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Draw an expression onto a 2D context (any canvas-like context). Coordinates are for a size x size square
 * decal, like a classic face decal; transparent where there is no ink unless `background` is given.
 */
export function drawFace(g, p, { size = 256, ink = "#111111", eyeColor = null, glow = null, background = null } = {}) {
  const P = { ...FACE_DEFAULTS, ...p }, s = size / 256;
  g.save();
  g.clearRect(0, 0, size, size);
  if (background) { g.fillStyle = background; g.fillRect(0, 0, size, size); }
  g.scale(s, s);
  g.lineCap = "round"; g.lineJoin = "round";
  const eyeInk = eyeColor || ink;
  const lx = clamp(P.lookX, -1, 1) * 7, ly = clamp(P.lookY, -1, 1) * 6;

  // ---- eyes ----
  for (const side of [-1, 1]) {
    const cx = 128 + side * 42 + lx, cy = 106 + ly;
    const rx = 13 * P.eyeSize, ry = 19 * P.eyeSize;
    const winkThis = side > 0 ? P.wink : 0;
    if (P.ko > 0.5) { // x eyes
      g.strokeStyle = eyeInk; g.lineWidth = 8;
      g.beginPath(); g.moveTo(cx - 12, cy - 12); g.lineTo(cx + 12, cy + 12); g.moveTo(cx + 12, cy - 12); g.lineTo(cx - 12, cy + 12); g.stroke();
      continue;
    }
    if (P.wince > 0.5) { // > <
      g.strokeStyle = eyeInk; g.lineWidth = 8; const d = -side;
      g.beginPath(); g.moveTo(cx - d * 12, cy - 12); g.lineTo(cx + d * 10, cy); g.lineTo(cx - d * 12, cy + 12); g.stroke();
      continue;
    }
    const open = clamp(P.eyeOpen * (1 - winkThis), 0, 1);
    if (open < 0.12) { // closed: a gentle arc
      g.strokeStyle = eyeInk; g.lineWidth = 7;
      g.beginPath(); g.moveTo(cx - rx - 2, cy); g.quadraticCurveTo(cx, cy + (winkThis > 0.5 || P.squint > 0.5 ? -12 : 8), cx + rx + 2, cy); g.stroke();
      continue;
    }
    const top = ry * open, bottom = ry * open * (1 - clamp(P.squint, 0, 1) * 0.85);
    const eyePath = () => {
      g.beginPath();
      g.ellipse(cx, cy, rx, top, 0, Math.PI, 2 * Math.PI);
      g.ellipse(cx, cy, rx, Math.max(0.5, bottom), 0, 0, Math.PI);
      g.closePath();
    };
    if (glow) { g.shadowColor = glow; g.shadowBlur = 18; }
    if (P.whites > 0.05) {
      eyePath(); g.fillStyle = "#ffffff"; g.globalAlpha = clamp(P.whites, 0, 1); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = eyeInk; g.lineWidth = 5; g.stroke();
      const pr = rx * (1 - 0.55 * P.whites);
      g.beginPath(); g.ellipse(cx + lx * 0.4, cy + ly * 0.4, pr, Math.min(pr * 1.2, top), 0, 0, 2 * Math.PI); g.fillStyle = eyeInk; g.fill();
    } else { eyePath(); g.fillStyle = eyeInk; g.fill(); }
    g.shadowBlur = 0;
    // catch-light
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath(); g.ellipse(cx - rx * 0.3, cy - top * 0.45, rx * 0.28, Math.min(rx * 0.32, top * 0.4), 0, 0, 2 * Math.PI); g.fill();
  }

  // ---- brows ----
  if (P.brows > 0.5) {
    g.strokeStyle = ink; g.lineWidth = 9;
    for (const side of [-1, 1]) {
      const inner = 128 + side * 16, outer = 128 + side * 66;
      const base = 70 - P.browY * 16 - (P.eyeSize - 1) * 14;
      const yi = base + P.browAngle * 12, yo = base - P.browAngle * 7 + (P.browAngle < 0 ? -P.browAngle * 6 : 0);
      g.beginPath(); g.moveTo(inner, yi); g.quadraticCurveTo((inner + outer) / 2, Math.min(yi, yo) - 4, outer, yo); g.stroke();
    }
  }

  // ---- mouth ----
  const W = 56 * clamp(P.mouthWidth, 0.2, 1.5), my = 162, c = clamp(P.mouthCurve, -1, 1) * 24, sk = clamp(P.mouthSkew, -1, 1) * 10;
  const L = [128 - W, my + sk * 0.3], R = [128 + W, my - sk];
  const open = clamp(P.mouthOpen, 0, 1);
  if (open < 0.06) {
    g.strokeStyle = ink; g.lineWidth = 9;
    g.beginPath(); g.moveTo(L[0], L[1]); g.quadraticCurveTo(128, my + c * 1.6, R[0], R[1]); g.stroke();
  } else {
    const upper = my + c * 0.9 - open * 14, lower = my + c * 1.4 + open * 84;
    g.beginPath(); g.moveTo(L[0], L[1]); g.quadraticCurveTo(128, upper, R[0], R[1]); g.quadraticCurveTo(128, lower, L[0], L[1]); g.closePath();
    g.fillStyle = "#2a0c12"; g.fill();
    g.save(); g.clip();
    if (P.teeth > 0.05) { g.globalAlpha = clamp(P.teeth, 0, 1); g.fillStyle = "#ffffff"; g.fillRect(L[0] - 4, Math.min(L[1], R[1], upper) - 6, W * 2 + 8, 10 + open * 10); g.globalAlpha = 1; }
    if (P.tongue > 0.05) { g.globalAlpha = clamp(P.tongue, 0, 1); g.fillStyle = "#e0485a"; g.beginPath(); g.ellipse(128 + sk * 0.5, lower - 4, W * 0.55, 10 + open * 10, 0, 0, 2 * Math.PI); g.fill(); g.globalAlpha = 1; }
    g.restore();
    g.strokeStyle = ink; g.lineWidth = 7;
    g.beginPath(); g.moveTo(L[0], L[1]); g.quadraticCurveTo(128, upper, R[0], R[1]); g.quadraticCurveTo(128, lower, L[0], L[1]); g.closePath(); g.stroke();
  }

  // ---- extras ----
  if (P.blush > 0.02) {
    g.fillStyle = `rgba(255,105,130,${0.55 * clamp(P.blush, 0, 1)})`;
    for (const side of [-1, 1]) { g.beginPath(); g.ellipse(128 + side * 62, 140, 20, 10, 0, 0, 2 * Math.PI); g.fill(); }
  }
  if (P.tears > 0.02) {
    g.fillStyle = "rgba(110,190,255,0.85)";
    for (const side of [-1, 1]) { const x = 128 + side * 42, len = 50 * clamp(P.tears, 0, 1); g.beginPath(); g.moveTo(x - 4, 124 + ly); g.lineTo(x + 4, 124 + ly); g.lineTo(x + 6, 124 + ly + len); g.quadraticCurveTo(x, 132 + ly + len, x - 6, 124 + ly + len); g.closePath(); g.fill(); }
  }
  if (P.sweat > 0.02) {
    const k = clamp(P.sweat, 0, 1), x = 200, y = 62;
    g.fillStyle = "rgba(120,200,255,0.95)"; g.strokeStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y - 18 * k); g.quadraticCurveTo(x + 12 * k, y + 2, x, y + 8 * k); g.quadraticCurveTo(x - 12 * k, y + 2, x, y - 18 * k); g.fill(); g.stroke();
  }
  g.restore();
}

/** Resolve an expression name or a partial parameter object into a full parameter set. */
export function expression(nameOrParams, base = FACE_DEFAULTS) {
  if (typeof nameOrParams === "string") {
    const e = EXPRESSIONS[nameOrParams];
    if (!e) throw new Error(`blockrig: unknown expression "${nameOrParams}" (try ${Object.keys(EXPRESSIONS).join(", ")})`);
    return { ...FACE_DEFAULTS, ...e };
  }
  return { ...base, ...nameOrParams };
}

/** Linear blend of two parameter sets. */
export function mixFace(a, b, t) { const o = {}; for (const k in FACE_DEFAULTS) o[k] = a[k] + (b[k] - a[k]) * t; return o; }

/**
 * A live face: blends towards a target expression, blinks, looks around and can talk.
 *
 * Image faces: pass `images: { happy: img, angry: img, ... }` (any canvas-drawable images, e.g. face decals
 * you have the rights to use). Setting a name found in `images` crossfades to that picture; names without
 * an image fall back to the procedural face. `images.blink` (optional) is shown while blinking. Image
 * names do not have to be built-in expression names.
 * @param {{ size?: number, canvas?: {width:number,height:number,getContext:Function}, ink?: string, eyeColor?: string,
 *           glow?: string, background?: string|null, blink?: boolean, expression?: string|object, seed?: number,
 *           images?: Record<string, CanvasImageSource>, imageOffset?: number }} [o]
 */
export function createFace(o = {}) {
  const size = o.size || 256;
  let canvas = o.canvas || null;
  if (!canvas && typeof document !== "undefined") { canvas = document.createElement("canvas"); canvas.width = canvas.height = size; }
  const ctx = canvas ? canvas.getContext("2d") : null;
  const style = { size, ink: o.ink || "#111111", eyeColor: o.eyeColor || null, glow: o.glow || null, background: o.background || null };
  const images = o.images || {};
  let scratch = null; // offscreen canvas for crossfading a procedural face with an image
  const scratchCtx = () => {
    if (!scratch && typeof document !== "undefined") { scratch = document.createElement("canvas"); scratch.width = scratch.height = size; }
    return scratch ? scratch.getContext("2d") : null;
  };
  let seed = (o.seed ?? 7) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const startName = typeof o.expression === "string" ? o.expression : "neutral";
  const layerFor = (n) => (typeof n === "string" && images[n] ? images[n] : "proc");
  const face = {
    isFace: true, canvas, style, images,
    current: EXPRESSIONS[startName] || typeof o.expression === "object" ? expression(o.expression || "neutral") : expression("neutral"),
    target: EXPRESSIONS[startName] || typeof o.expression === "object" ? expression(o.expression || "neutral") : expression("neutral"),
    name: startName,
    rate: 1 / 0.15,
    // image crossfade: the picture (or "proc" for the procedural face) shown now and the one fading out
    layer: { cur: layerFor(startName), prev: null, mix: 1, rate: 1 / 0.15 },
    blinking: o.blink !== false, nextBlink: 1.5 + rnd() * 2.5, blinkT: -1,
    look: { x: 0, y: 0 }, talking: false, talkT: 0,
    listeners: [], dirty: true, time: 0,
    /**
     * Change expression: an image name, a name from EXPRESSIONS, or a partial parameter object.
     * Image faces swap instantly by default, like replacing the Texture of a Roblox Head's "face" Decal;
     * pass `fade` (seconds) to crossfade instead (a BlockRig extra). Procedural faces fade over 0.15 s.
     */
    set(nameOrParams, { fade } = {}) {
      const isImage = typeof nameOrParams === "string" && images[nameOrParams];
      if (fade === undefined) fade = isImage || (this.layer.cur !== "proc") ? 0 : 0.15;
      if (!isImage) {
        this.target = expression(nameOrParams);
        this.rate = fade > 0 ? 1 / fade : Infinity;
        if (!(fade > 0)) this.current = { ...this.target };
      }
      this.name = typeof nameOrParams === "string" ? nameOrParams : "custom";
      const next = layerFor(nameOrParams);
      if (next !== this.layer.cur) {
        this.layer.prev = this.layer.cur; this.layer.cur = next;
        this.layer.mix = fade > 0 ? 0 : 1; this.layer.rate = fade > 0 ? 1 / fade : Infinity;
      }
      this.dirty = true;
      return this;
    },
    /** True while an image (not the procedural face) is showing. */
    get usingImage() { return this.layer.cur !== "proc"; },
    /** Point the eyes (-1..1 each); added on top of the expression's own lookX / lookY. */
    lookAt(x = 0, y = 0) { this.look.x = x; this.look.y = y; this.dirty = true; return this; },
    talk(on = true) { this.talking = on; this.dirty = true; return this; },
    onChange(fn) { this.listeners.push(fn); return this; },
    /** The parameters actually drawn this frame (expression + blink + look + talk). */
    params() {
      const p = { ...this.current };
      p.lookX += this.look.x; p.lookY += this.look.y;
      if (this.blinkT >= 0) { const b = Math.sin(Math.min(1, this.blinkT / 0.14) * Math.PI); p.eyeOpen *= 1 - b; }
      if (this.talking) p.mouthOpen = Math.max(p.mouthOpen, 0.15 + 0.35 * Math.abs(Math.sin(this.talkT * 14)));
      return p;
    },
    /** Advance blending, blinking and talking. Returns true when the picture changed. */
    update(dt) {
      this.time += dt;
      let changed = this.dirty;
      const k = this.rate === Infinity ? 1 : 1 - Math.exp(-dt * this.rate * 2.3);
      for (const key in FACE_DEFAULTS) {
        const d = this.target[key] - this.current[key];
        if (Math.abs(d) > 1e-4) { this.current[key] += d * k; changed = true; } else this.current[key] = this.target[key];
      }
      if (this.blinking && this.current.ko < 0.5 && this.current.wince < 0.5) {
        if (this.blinkT >= 0) { this.blinkT += dt; changed = true; if (this.blinkT > 0.14) { this.blinkT = -1; this.nextBlink = 2 + rnd() * 3.5; } }
        else if ((this.nextBlink -= dt) <= 0) { this.blinkT = 0; changed = true; }
      }
      if (this.talking) { this.talkT += dt; changed = true; }
      if (this.layer.mix < 1) { this.layer.mix = this.layer.rate === Infinity ? 1 : Math.min(1, this.layer.mix + dt * this.layer.rate); changed = true; }
      if (changed) { this.draw(); this.dirty = false; for (const fn of this.listeners) fn(this); }
      return changed;
    },
    draw() {
      if (!ctx) return this;
      const L = this.layer;
      if (L.cur === "proc" && L.mix >= 1) { drawFace(ctx, this.params(), style); return this; }
      const p = this.params(), s = size / 256;
      const paint = (layer, alpha) => {
        if (!layer || alpha <= 0.001) return;
        ctx.globalAlpha = alpha;
        if (layer === "proc") {
          const sc = scratchCtx();
          if (sc) { drawFace(sc, p, { ...style, background: null }); ctx.drawImage(scratch, 0, 0, size, size); }
          else drawFace(ctx, p, { ...style, background: null }); // no offscreen canvas (e.g. tests): draw directly
          return;
        }
        // blinking swaps in images.blink if given; look direction nudges the decal
        const img = this.blinkT >= 0 && images.blink && layer !== images.blink ? images.blink : layer;
        const ox = clamp(p.lookX, -1, 1) * 8 * s * (o.imageOffset ?? 1), oy = clamp(p.lookY, -1, 1) * 6 * s * (o.imageOffset ?? 1);
        ctx.drawImage(img, ox, oy, size, size);
      };
      ctx.save();
      ctx.clearRect(0, 0, size, size);
      if (style.background) { ctx.fillStyle = style.background; ctx.fillRect(0, 0, size, size); }
      if (L.mix < 1) paint(L.prev, 1 - L.mix);
      paint(L.cur, L.mix < 1 ? L.mix : 1);
      ctx.globalAlpha = 1;
      ctx.restore();
      return this;
    },
  };
  face.draw();
  return face;
}
