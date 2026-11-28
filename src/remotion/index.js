// blockrig/remotion: the 2D layers every story short draws over its 3D canvas, as Remotion components: word-synced
// captions with speaker tags, the soundtrack (voice clips on their shots, music sections), vignette, scanlines,
// glitch and flash cuts, a screen flash (lightning), and the debug overlay with the app zones. Plain JavaScript
// (React.createElement), frame-pure. Peer dependencies: react, remotion, @remotion/media (the video already has them).
// Fonts are the video's choice: load one (e.g. @remotion/google-fonts/Montserrat) and pass its fontFamily.
// BlockRig extra.
import { createElement as h, Fragment } from "react";
import { AbsoluteFill, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { rng } from "../video/motion.js";
import { ZONES } from "../video/zones.js";

export { ZONES };
/** Where captions sit, as a fraction of the frame height. */
export const CAPTION_TOP = ZONES.captions[0];

/**
 * Word-synced captions: white with a thick black outline, one highlighted word, popping in on the caption's first
 * word. `speakers`: shot id -> `{ name, colour }`, shown as a small tag above dialogue lines (speakersOf).
 */
export function Captions({ captions, top = CAPTION_TOP, highlight = "#ffd60a", size = 104, speakers, fontFamily = "Montserrat, 'Arial Black', sans-serif" }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), t = frame / fps;
  const cap = captions.find((c) => t >= c.start && t < c.end);
  if (!cap) return null;
  const s = spring({ frame: frame - Math.round(cap.start * fps), fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  const words = cap.text.split(" "), who = speakers?.[cap.shot];
  return h(AbsoluteFill, { style: { alignItems: "center", pointerEvents: "none" } },
    h("div", { style: {
      position: "absolute", top: `${top * 100}%`, width: "88%", textAlign: "center",
      transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -4}deg)`, opacity: Math.min(1, s * 2),
      fontFamily, fontWeight: 800, fontSize: size, lineHeight: 1.05, letterSpacing: "0.01em",
      color: "#ffffff", WebkitTextStroke: `${Math.round(size * 0.135)}px #000000`, paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.55)",
    } },
    who ? h("div", { style: { display: "inline-block", fontSize: size * 0.42, WebkitTextStroke: "0px", background: who.colour, color: "#fff", padding: `${size * 0.06}px ${size * 0.22}px`, borderRadius: size * 0.14, marginBottom: size * 0.12, border: `${Math.round(size * 0.05)}px solid #000`, textShadow: "none" } }, who.name) : null,
    who ? h("br") : null,
    ...words.map((w, i) => {
      const clean = w.replace(/[^A-Z0-9']/gi, ""), hot = cap.highlight && clean.toUpperCase() === cap.highlight.toUpperCase();
      return h("span", { key: i, style: { color: hot ? highlight : "#ffffff" } }, w + (i < words.length - 1 ? " " : ""));
    })));
}

/** Voice clips on their shots and the music sections under them, served from the public folder (npm run voice). */
export function Soundtrack({ timeline, musicVolume = 0.2, voiceVolume = 1 }) {
  const { SHOTS, MUSIC, FPS } = timeline;
  return h(Fragment, null,
    ...SHOTS.filter((s) => s.audio).map((s) => h(Sequence, { key: s.id, from: s.startFrame, durationInFrames: s.endFrame - s.startFrame + 30, name: `voice ${s.id}` }, h(Audio, { src: staticFile(s.audio), volume: voiceVolume }))),
    ...MUSIC.filter((m) => m.file).map((m, i) => h(Sequence, { key: `m${i}`, from: Math.round(m.from * FPS), durationInFrames: Math.max(1, Math.round((m.to - m.from) * FPS)), name: `music ${m.theme}` }, h(Audio, { src: staticFile(m.file), volume: musicVolume }))));
}

export const Vignette = ({ strength = 0.5 }) => h(AbsoluteFill, { style: { background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,12,${strength}) 100%)`, pointerEvents: "none" } });
export const Scanlines = ({ alpha = 0.1 }) => h(AbsoluteFill, { style: { background: `repeating-linear-gradient(0deg, rgba(0,0,0,${alpha}) 0px, rgba(0,0,0,${alpha}) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)`, pointerEvents: "none" } });

/** RGB-split bars and a flash for the first 9 frames of the listed shots (the cuts that land a beat). Seeded. */
export function GlitchCut({ timeline, shots, colours = ["255,46,136", "25,227,196"] }) {
  const frame = useCurrentFrame();
  const hit = timeline.SHOTS.find((s) => shots.includes(s.id) && frame >= s.startFrame && frame < s.startFrame + 9);
  if (!hit) return null;
  const k = frame - hit.startFrame, r = rng(hit.startFrame * 31 + k), fade = 1 - k / 9;
  return h(AbsoluteFill, { style: { pointerEvents: "none", mixBlendMode: "screen" } },
    ...Array.from({ length: 7 }, (_, i) => h("div", { key: i, style: { position: "absolute", left: 0, right: 0, top: `${r() * 100}%`, height: `${2 + r() * 7}%`, transform: `translateX(${(r() - 0.5) * 30}%)`, background: `rgba(${colours[i % 2]},${0.55 * fade})` } })),
    h(AbsoluteFill, { style: { background: `rgba(255,255,255,${0.35 * fade * (k < 2 ? 1 : 0)})` } }));
}

/** A short white flash at the start of the listed shots (a punchy cut). */
export function FlashCut({ timeline, shots }) {
  const frame = useCurrentFrame();
  const hit = timeline.SHOTS.find((s) => shots.includes(s.id) && frame >= s.startFrame && frame < s.startFrame + 6);
  if (!hit) return null;
  return h(AbsoluteFill, { style: { background: `rgba(255,255,255,${0.6 * (1 - (frame - hit.startFrame) / 6)})`, pointerEvents: "none" } });
}

/** A screen-wide flash of `amount` 0..1 (lightning: pass the strike's brightness this frame). */
export function ScreenFlash({ amount, colour = "225,232,255" }) {
  if (!(amount >= 0.01)) return null;
  return h(AbsoluteFill, { style: { background: `rgba(${colour},${0.55 * amount})`, mixBlendMode: "screen", pointerEvents: "none" } });
}

const zone = (style, label, colour) => h("div", { key: label, style: { position: "absolute", border: `3px dashed ${colour}`, background: `${colour}22`, color: colour, font: "600 26px monospace", padding: 6, ...style } }, label);
/** Shot id, frame, time, the shot's notes, and the zones that matter on a vertical short (captions, app buttons). */
export function DebugOverlay({ timeline, extra = [] }) {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), t = frame / fps;
  const { shot, local, p } = timeline.shotAt(t), Z = ZONES;
  const lines = [
    `${shot.id}  ${shot.location ?? ""}  frame ${frame}  t ${t.toFixed(2)}s  local ${local.toFixed(2)}s  ${(p * 100).toFixed(0)}%`,
    shot.narration ? `“${shot.narration}”` : "(silent)", `camera: ${shot.camera ?? "-"}`, `action: ${shot.action ?? "-"}`,
    `weather: ${shot.weather ?? "clear"}   time: ${shot.time ?? "day"}   mood: ${shot.mood ?? "-"}`, ...extra,
  ];
  return h(AbsoluteFill, { style: { pointerEvents: "none" } },
    zone({ left: "6%", right: "6%", top: `${Z.captions[0] * 100}%`, height: `${(Z.captions[1] - Z.captions[0]) * 100}%` }, "captions", "#ffd60a"),
    zone({ right: 0, width: `${(1 - Z.buttons.x[0]) * 100}%`, top: `${Z.buttons.y[0] * 100}%`, height: `${(Z.buttons.y[1] - Z.buttons.y[0]) * 100}%` }, "app buttons", "#ff4d5e"),
    zone({ left: 0, right: 0, bottom: 0, height: `${(1 - Z.bottom) * 100}%` }, "app caption / username", "#ff4d5e"),
    zone({ left: 0, right: 0, top: 0, height: `${Z.top * 100}%` }, "app top bar", "#ff4d5e"),
    h("div", { key: "c", style: { position: "absolute", left: "50%", top: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20, border: "2px solid #19e3c4", borderRadius: 20 } }),
    h("div", { key: "n", style: { position: "absolute", left: 24, top: "8%", right: 24, background: "rgba(0,0,0,0.72)", color: "#fff", font: "500 24px/1.35 monospace", padding: 16, borderRadius: 10, whiteSpace: "pre-wrap" } }, lines.join("\n")));
}
