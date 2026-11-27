// Word-synced captions in the story-short style: Montserrat ExtraBold, white with a thick black outline, one
// highlighted word, popping in on the caption's first word.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import type { Caption } from "./timeline";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

/** Where captions sit, as a fraction of the frame height (the debug overlay draws this band). */
export const CAPTION_TOP = 0.62;

export const Captions: React.FC<{ captions: Caption[]; top?: number; highlight?: string; size?: number }> = ({ captions, top = CAPTION_TOP, highlight = "#ffd60a", size = 104 }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), t = frame / fps;
  const cap = captions.find((c) => t >= c.start && t < c.end);
  if (!cap) return null;
  const s = spring({ frame: frame - Math.round(cap.start * fps), fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  const words = cap.text.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: `${top * 100}%`, width: "88%", textAlign: "center",
        transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -4}deg)`, opacity: Math.min(1, s * 2),
        fontFamily, fontWeight: 800, fontSize: size, lineHeight: 1.05, letterSpacing: "0.01em",
        color: "#ffffff", WebkitTextStroke: `${Math.round(size * 0.135)}px #000000`, paintOrder: "stroke fill",
        textShadow: "0 8px 0 rgba(0,0,0,0.55)",
      }}>
        {words.map((w, i) => {
          const clean = w.replace(/[^A-Z0-9']/gi, "");
          const hot = cap.highlight && clean.toUpperCase() === cap.highlight.toUpperCase();
          return <span key={i} style={{ color: hot ? highlight : "#ffffff" }}>{w}{i < words.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};
