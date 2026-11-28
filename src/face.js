// Classic Roblox faces: a Decal named "face" on the Head (Face = Front) whose Texture is an image. Changing the
// face replaces that Texture, instantly: that is all a classic face does in Roblox (no blinking, no blending).
// https://create.roblox.com/docs/reference/engine/classes/Decal
// For faces that move, use what Roblox uses: a dynamic head driven by its FaceControls (facs.js, rig.faceControls)
// or face accessories (rig.addAccessory). BlockRig draws no faces of its own: the images come from the caller
// (face decals you have the right to use).
//
//   const face = createFace({ images: { smile: smileImg, sad: sadImg } });   // starts on the first image
//   const rig = createRig({ face });
//   face.set("sad");                       // or rig.setExpression("sad"), or a "face:sad" marker in a clip

/**
 * A classic face Decal: `images` (name -> any canvas-drawable image), `expression` (the name to start on; the first
 * image by default), `size` (canvas pixels, 256), `canvas` (your own), `background` (a colour under the decal,
 * transparent by default, as a Decal is).
 * @param {{ images?: Record<string, CanvasImageSource>, expression?: string, size?: number, background?: string|null,
 *           canvas?: { width: number, height: number, getContext: Function } }} [o]
 */
export function createFace(o = {}) {
  const size = o.size || 256, images = o.images || {};
  let canvas = o.canvas || null;
  if (!canvas && typeof document !== "undefined") { canvas = document.createElement("canvas"); canvas.width = canvas.height = size; }
  const ctx = canvas ? canvas.getContext("2d") : null;
  const first = Object.keys(images)[0] ?? null;
  const face = {
    isFace: true, canvas, images, background: o.background ?? null,
    name: o.expression ?? first,
    listeners: [], dirty: true,
    /** Show another image (replaces the Decal's Texture, instantly). Unknown names throw. */
    set(name) {
      if (!images[name]) throw new Error(`blockrig: no face image "${name}" (have ${Object.keys(images).join(", ") || "none"})`);
      if (name !== this.name) { this.name = name; this.dirty = true; }
      return this;
    },
    /** Classic faces are always images. */
    get usingImage() { return true; },
    onChange(fn) { this.listeners.push(fn); return this; },
    /** Redraw after a change; returns true when the picture changed. (The Animator / rig.update call it.) */
    update() {
      if (!this.dirty) return false;
      this.draw(); this.dirty = false;
      for (const fn of this.listeners) fn(this);
      return true;
    },
    draw() {
      if (!ctx) return this;
      ctx.clearRect(0, 0, size, size);
      if (this.background) { ctx.fillStyle = this.background; ctx.fillRect(0, 0, size, size); }
      const img = this.name ? images[this.name] : null;
      if (img) ctx.drawImage(img, 0, 0, size, size);
      return this;
    },
  };
  face.draw();
  return face;
}
