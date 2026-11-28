// Faces that follow the voice: the mouth opens and closes on every syllable of the words actually spoken (the voice's
// word timings), and the face takes the expression of the line's emotion. Frame-pure (a function of the time). Works
// on BlockRig's drawn faces (mouthOpen) and on Roblox dynamic heads (FACS JawDrop + a little lip parting); image faces
// and face accessories keep their picture. BlockRig extra: Roblox has no lip sync from audio.
//
//   const open = mouthAt(shot.words, time)                 // 0..1 (timeline shots carry their words in video time)
//   talk(rig, open, faceFor(shot.emotion))                 // or your own expression name
import { syllables } from "../voice/text.js";
import { expression } from "../face.js";
import { facsExpression } from "../facs.js";

/** A line's emotion (blockrig/voice moods) -> the face expression that reads as it. */
export const EMOTION_FACE = {
  neutral: "neutral", flat: "neutral", happy: "happy", excited: "grin", panic: "scared", shocked: "shocked", scared: "scared",
  sad: "sad", serious: "determined", smug: "smug", angry: "angry", whisper: "neutral",
};
export const faceFor = (emotion, fallback = "neutral") => EMOTION_FACE[emotion] ?? fallback;

/**
 * How open the mouth is at `t` (seconds, the same clock as the words' times), 0..1: one open-close per syllable of
 * the word being said, closed between words. `words`: `[{ word, start, end }]`.
 */
export function mouthAt(words, t, { strength = 0.85 } = {}) {
  if (!words) return 0;
  for (const w of words) {
    if (t < w.start || t >= w.end) continue;
    const n = syllables(w.word ?? ""), k = ((t - w.start) / Math.max(1e-3, w.end - w.start)) * n;
    const s = Math.sin(Math.PI * (k - Math.floor(k)));           // 0 -> 1 -> 0 over each syllable
    return strength * Math.pow(s, 0.7) * (0.75 + 0.25 * ((Math.floor(k) * 7919) % 3) / 2); // a little variety between syllables
  }
  return 0;
}

/**
 * Set a talking face: the expression with the mouth opened by `open` (0..1). Drawn faces get `mouthOpen`; dynamic heads
 * get JawDrop (and a little LowerLipDepressor). Returns false for faces it cannot move (images, face accessories).
 */
export function talk(rig, open, expressionName = "neutral") {
  if (rig.dynamicHead && rig.faceControls && rig.applyFaceControls) {
    const base = facsExpression(expressionName);
    Object.assign(rig.faceControls, base, { JawDrop: Math.max(base.JawDrop ?? 0, open * 0.6), LowerLipDepressorLeft: Math.max(base.LowerLipDepressorLeft ?? 0, open * 0.3), LowerLipDepressorRight: Math.max(base.LowerLipDepressorRight ?? 0, open * 0.3) });
    rig.applyFaceControls();
    return true;
  }
  const face = rig.face;
  if (!face || typeof face.set !== "function" || face.usingImage) return false;
  const e = expression(expressionName);
  face.set({ ...e, mouthOpen: Math.max(e.mouthOpen, open) }, { fade: 0 });
  rig.updateFace?.(0);
  return true;
}
