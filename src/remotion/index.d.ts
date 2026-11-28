import type { Caption, Timeline, SpeakerTag } from "../video/index.js";

export const ZONES: { captions: [number, number]; buttons: { x: [number, number]; y: [number, number] }; bottom: number; top: number };
export const CAPTION_TOP: number;
// Components are typed loosely so the library needs no React types; they return Remotion / React elements.
type Component<P> = (props: P) => any;
export const Captions: Component<{ captions: Caption[]; top?: number; highlight?: string; size?: number; speakers?: Record<string, SpeakerTag>; fontFamily?: string }>;
export const Soundtrack: Component<{ timeline: Timeline; musicVolume?: number; voiceVolume?: number }>;
export const Vignette: Component<{ strength?: number }>;
export const Scanlines: Component<{ alpha?: number }>;
export const GlitchCut: Component<{ timeline: Timeline; shots: string[]; colours?: [string, string] }>;
export const FlashCut: Component<{ timeline: Timeline; shots: string[] }>;
export const ScreenFlash: Component<{ amount: number; colour?: string }>;
export const DebugOverlay: Component<{ timeline: Timeline; extra?: string[] }>;
