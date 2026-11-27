// Word-synced captions in the standard story-short style: Montserrat ExtraBold, white with a thick black
// outline, one highlighted word, popping in on the caption's first word.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { CAPTIONS } from "./timeline";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export const Captions: React.FC = () => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig(), t = frame / fps;
  const cap = CAPTIONS.find((c) => t >= c.start && t < c.end);
  if (!cap) return null;
  const s = spring({ frame: frame - Math.round(cap.start * fps), fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
  const words = cap.text.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: "62%", width: "88%", textAlign: "center",
        transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -4}deg)`, opacity: Math.min(1, s * 2),
        fontFamily, fontWeight: 800, fontSize: 104, lineHeight: 1.05, letterSpacing: "0.01em",
        color: "#ffffff", WebkitTextStroke: "14px #000000", paintOrder: "stroke fill",
        textShadow: "0 8px 0 rgba(0,0,0,0.55)",
      }}>
        {words.map((w, i) => {
          const clean = w.replace(/[^A-Z0-9']/gi, "");
          const hot = cap.highlight && clean.toUpperCase() === cap.highlight.toUpperCase();
          return <span key={i} style={{ color: hot ? "#ffd60a" : "#ffffff" }}>{w}{i < words.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};
