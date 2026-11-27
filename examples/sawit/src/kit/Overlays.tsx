// 2D layers over the 3D canvas (CSS, because an EffectComposer blanks Remotion's frames): vignette, optional
// scanlines, an RGB glitch on chosen cuts, a white flash on cuts, and the lightning flash.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { rng } from "./rng";
import { lightningAt } from "./weather";
import type { Timeline } from "./timeline";

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.5 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,12,${strength}) 100%)`, pointerEvents: "none" }} />
);
export const Scanlines: React.FC<{ alpha?: number }> = ({ alpha = 0.1 }) => (
  <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, rgba(0,0,0,${alpha}) 0px, rgba(0,0,0,${alpha}) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)`, pointerEvents: "none" }} />
);

/** RGB-split bars and a flash for the first 9 frames of the listed shots (the cuts that land a beat). */
export const GlitchCut: React.FC<{ timeline: Timeline; shots: string[]; colours?: [string, string] }> = ({ timeline, shots, colours = ["255,46,136", "25,227,196"] }) => {
  const frame = useCurrentFrame();
  const hit = timeline.SHOTS.find((s) => shots.includes(s.id) && frame >= s.startFrame && frame < s.startFrame + 9);
  if (!hit) return null;
  const k = frame - hit.startFrame, r = rng(hit.startFrame * 31 + k), fade = 1 - k / 9;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${r() * 100}%`, height: `${2 + r() * 7}%`, transform: `translateX(${(r() - 0.5) * 30}%)`, background: `rgba(${colours[i % 2]},${0.55 * fade})` }} />
      ))}
      <AbsoluteFill style={{ background: `rgba(255,255,255,${0.35 * fade * (k < 2 ? 1 : 0)})` }} />
    </AbsoluteFill>
  );
};

/** A short white flash at the start of the listed shots (a punchy cut). */
export const FlashCut: React.FC<{ timeline: Timeline; shots: string[] }> = ({ timeline, shots }) => {
  const frame = useCurrentFrame();
  const hit = timeline.SHOTS.find((s) => shots.includes(s.id) && frame >= s.startFrame && frame < s.startFrame + 6);
  if (!hit) return null;
  return <AbsoluteFill style={{ background: `rgba(255,255,255,${0.6 * (1 - (frame - hit.startFrame) / 6)})`, pointerEvents: "none" }} />;
};

/** Screen-wide lightning flash for shots whose weather has strikes. */
export const LightningFlash: React.FC<{ strikes: number[]; local: number }> = ({ strikes, local }) => {
  const f = lightningAt(strikes, local);
  if (f < 0.01) return null;
  return <AbsoluteFill style={{ background: `rgba(225,232,255,${0.55 * f})`, mixBlendMode: "screen", pointerEvents: "none" }} />;
};
