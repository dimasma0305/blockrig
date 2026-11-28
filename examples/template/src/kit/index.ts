// The template's kit: generic, story-independent building blocks. Story-specific code lives next to it in
// src/cast, src/world, src/direction and src/fx. The tested, shared parts come from BlockRig (blockrig/video):
// timeline and captions, seeded random and easing, frame-pure posing, camera recipes, times of day, surfaces, Roblox
// maps, the staging check, drawn boards, the 2D layout plan, ground layers and per-location lamps. What stays here
// needs React / Remotion / post-processing, or is this template's own look (houses, weather, textures). Fix shared things in BlockRig (src/video/) so every video gets them.
export {
  createTimeline, speakersOf, rng, clamp01, smooth, easeInOut, easeOut, lerp,
  poseAt, groundRig, FEET, KNEEL, SEAT, ON_SEAT,
  V, move, pushIn, orbit, follow, lowAngle, topDown, applyCamera, frame,
  LOOK, applyLook, avatarAmbient, TIMES, daylight, mixDaylight, createLighting,
  buildRobloxMap, surfaceOf, restOn,
  panel, pic, coverFit, videoCard, browserWindow, banner, poster, standee, loadImages,
  Plan, rect, circle, polygon, points, inside, layer, checkGround, groundConflicts, LAYER_STEP, lightsByLocation,
} from "blockrig/video";
export type {
  Word, StoryShot, StoryFile, Timings, Shot, Caption, Timeline, SpeakerTag, Cam, Layer, Daylight, Lighting,
  MapPart, MapLight, MapData, MapAssets, MapOpts, RobloxMap, Surface, Panel, Shape, PlanItem,
} from "blockrig/video";
export * from "./weather";
export * from "./textures";
export * from "./structures";
export { Captions, CAPTION_TOP } from "./Captions";
export { Soundtrack } from "./Soundtrack";
export { Vignette, Scanlines, GlitchCut, FlashCut, LightningFlash } from "./Overlays";
export { DebugOverlay } from "./DebugOverlay";
export * from "./assets";
export * from "./post";
export * from "./fire";
