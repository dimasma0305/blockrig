// 2D layers of this video (CSS over the 3D canvas, frame-pure): the AGE cards (docs/story.md `title:`), the freeze
// frame of the hook (s01-s03), the VHS rewind into the nursery (end of s03, start of s04), the green flash on
// ACCESS GRANTED, and the cut to black at the end.
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { rng } from "blockrig/video";
import type { Timeline } from "../kit";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export const SPEAKERS: Record<string, { name: string; colour: string }> = {
  me: { name: "ME", colour: "#1fa392" }, mom: { name: "MOM", colour: "#d6457a" }, dad: { name: "DAD", colour: "#2f6fd6" },
  friend: { name: "BEST FRIEND", colour: "#7b3fc4" }, system: { name: "SYSTEM", colour: "#e08a00" },
};
export const speakersOf = (T: Timeline) => Object.fromEntries(T.SHOTS.filter((s: any) => s.speaker && SPEAKERS[s.speaker]).map((s: any) => [s.id, SPEAKERS[s.speaker]]));

export const Layers2D: React.FC<{ timeline: Timeline }> = ({ timeline: T }) => {
  const frame = useCurrentFrame(), t = frame / T.FPS, { shot, local } = T.shotAt(t), fps = T.FPS, s = shot as any, n = +shot.id.slice(1);
  const out: React.ReactNode[] = [];
  // the freeze frame of the hook: a cold tint, a pause mark
  if (n >= 2 && n <= 3) out.push(<AbsoluteFill key="freeze" style={{ background: "rgba(70,110,170,0.12)", mixBlendMode: "multiply" }} />,
    <div key="pause" style={{ position: "absolute", top: "9%", left: "7%", fontFamily, fontSize: 64, color: "#fff", WebkitTextStroke: "8px #000", paintOrder: "stroke fill", opacity: 0.85 }}>❚❚ PAUSED</div>);
  // the rewind: the last 0.9 s of s03 and the first 0.5 s of s04
  const rewindIn = shot.id === "s02" ? local - (shot.dur - 0.9) : shot.id === "s04" ? 0.9 + local : -1;
  if (rewindIn >= 0 && rewindIn < 1.4) {
    const r = rng(frame * 7 + 1), k = rewindIn < 0.9 ? rewindIn / 0.9 : 1 - (rewindIn - 0.9) / 0.5;
    out.push(<AbsoluteFill key="rw" style={{ background: `rgba(20,10,40,${0.35 * k})` }}>
      {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${r() * 100}%`, height: `${1 + r() * 4}%`, background: `rgba(255,255,255,${0.25 * k})`, transform: `translateX(${(r() - 0.5) * 20}%)` }} />)}
      <div style={{ position: "absolute", top: "10%", left: "7%", fontFamily, fontSize: 92, color: "#fff", WebkitTextStroke: "10px #000", paintOrder: "stroke fill", opacity: k }}>◀◀ REWIND</div>
    </AbsoluteFill>);
  }
  // the AGE card: pops in at the start of its shot and stays small in the corner
  if (s.title) {
    const f = Math.round(local * fps), sp = spring({ frame: f, fps, config: { damping: 11, stiffness: 180, mass: 0.7 } }), big = interpolate(local, [1.2, 1.7], [1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    out.push(<div key="age" style={{ position: "absolute", top: "8%", left: "50%", transform: `translateX(-50%) scale(${sp * big}) rotate(${(1 - sp) * 8 - 3}deg)`, transformOrigin: "50% 0",
      fontFamily, fontWeight: 800, fontSize: 170, color: "#ffd60a", WebkitTextStroke: "22px #000", paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>{s.title}</div>);
  }
  // the explainer: what the jargon means (docs/story.md `note:`), a sticker under the age card
  if (s.note) {
    const sp = spring({ frame: Math.round((local - 0.25) * fps), fps, config: { damping: 13, stiffness: 160 } });
    out.push(<div key="note" style={{ position: "absolute", top: s.title ? "19%" : "10%", left: "50%", transform: `translateX(-50%) scale(${Math.max(0, sp)}) rotate(-2deg)`, maxWidth: "84%", textAlign: "center",
      background: "#ffffff", color: "#111", border: "8px solid #111", borderRadius: 28, padding: "14px 34px", fontFamily, fontWeight: 800, fontSize: 58, lineHeight: 1.1, boxShadow: "0 10px 0 rgba(0,0,0,0.45)" }}>{s.note}</div>);
  }
  // ACCESS GRANTED: a green flash
  if (shot.id === "s57" && local > 0.3 && local < 0.75) out.push(<AbsoluteFill key="ok" style={{ background: `rgba(40,255,120,${0.35 * (1 - (local - 0.3) / 0.45)})` }} />);
  // the cut to black at the very end
  if (shot.idx === T.SHOTS.length - 1) { const k = interpolate(local, [shot.dur - 0.9, shot.dur - 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); if (k > 0) out.push(<AbsoluteFill key="end" style={{ background: `rgba(0,0,0,${k})` }} />); }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{out}</AbsoluteFill>;
};
