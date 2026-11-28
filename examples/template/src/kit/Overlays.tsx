// 2D layers over the 3D canvas (blockrig/remotion: vignette, scanlines, glitch and flash cuts, screen flash). The
// lightning flash reads this template's weather (src/kit/weather.ts lightningAt).
import { ScreenFlash } from "blockrig/remotion";
import { lightningAt } from "./weather";

export { Vignette, Scanlines, GlitchCut, FlashCut } from "blockrig/remotion";

/** Screen-wide lightning flash for shots whose weather has strikes. */
export const LightningFlash = ({ strikes, local }: { strikes: number[]; local: number }) => <ScreenFlash amount={lightningAt(strikes, local)} />;
