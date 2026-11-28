// Debug overlay: shot id, frame, time, the shot's notes, and the zones that matter on a vertical short: where
// captions sit, and where TikTok / Shorts / Reels draw their own buttons and text. Turn it on with
// `npm run studio` -> input props { "debug": true }, or `npx remotion render ... --props='{"debug":true}'`.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_TOP } from "./Captions";
import type { Timeline } from "blockrig/video";

const zone = (style: React.CSSProperties, label: string, colour: string) => (
  <div style={{ position: "absolute", border: `3px dashed ${colour}`, background: `${colour}22`, color: colour, font: "600 26px monospace", padding: 6, ...style }}>{label}</div>
);

export const DebugOverlay: React.FC<{ timeline: Timeline; extra?: string[] }> = ({ timeline, extra = [] }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), t = frame / fps;
  const { shot, local, p } = timeline.shotAt(t);
  const lines = [
    `${shot.id}  ${shot.location ?? ""}  frame ${frame}  t ${t.toFixed(2)}s  local ${local.toFixed(2)}s  ${(p * 100).toFixed(0)}%`,
    shot.narration ? `“${shot.narration}”` : "(silent)",
    `camera: ${shot.camera ?? "-"}`,
    `action: ${shot.action ?? "-"}`,
    `weather: ${shot.weather ?? "clear"}   time: ${(shot as any).time ?? "day"}   mood: ${shot.mood ?? "-"}`,
    ...extra,
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {zone({ left: "6%", right: "6%", top: `${CAPTION_TOP * 100}%`, height: "13%" }, "captions", "#ffd60a")}
      {zone({ right: 0, width: "14%", top: "42%", height: "40%" }, "app buttons", "#ff4d5e")}
      {zone({ left: 0, right: 0, bottom: 0, height: "16%" }, "app caption / username", "#ff4d5e")}
      {zone({ left: 0, right: 0, top: 0, height: "7%" }, "app top bar", "#ff4d5e")}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20, border: "2px solid #19e3c4", borderRadius: 20 }} />
      <div style={{ position: "absolute", left: 24, top: "8%", right: 24, background: "rgba(0,0,0,0.72)", color: "#fff", font: "500 24px/1.35 monospace", padding: 16, borderRadius: 10, whiteSpace: "pre-wrap" }}>
        {lines.join("\n")}
      </div>
    </AbsoluteFill>
  );
};
