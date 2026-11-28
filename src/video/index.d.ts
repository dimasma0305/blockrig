import type * as THREE from "three";

// ---- motion
export function rng(seed: number): () => number;
export function clamp01(x: number): number;
export function smooth(x: number): number;
export function easeInOut(x: number): number;
export function easeOut(x: number): number;
export function lerp(a: number, b: number, t: number): number;

// ---- timeline
export type Word = { word: string; start: number; end: number };
export type StoryShot = {
  id: string; narration: string; captions?: { text: string; highlight?: string }[]; location?: string;
  action?: string; camera?: string; faces?: Record<string, string>; weather?: string; mood?: string; minSeconds?: number;
  /** who says the line in a dialogue shot (a cast key); the narrator when absent */
  speaker?: string;
  /** how the narrator says it (blockrig/voice moods) */ emotion?: string;
  /** how a name is pronounced (same word count) */ say?: string;
  /** on-screen explainer */ note?: string;
  /** lighting preset */ light?: string;
  /** time of day, "a -> b" across the shot */ time?: string;
};
export type StoryFile = {
  title: string; slug: string; fps: number; width: number; height: number;
  voice?: { gapSeconds?: number; [k: string]: unknown }; music?: { theme: string; fromShot: string }[]; shots: StoryShot[];
};
export type Timings = { clips: Record<string, { duration: number; words: Word[] }>; music: { file: string | null; from: number; to: number; theme: string }[]; total: number };
export type Shot = StoryShot & {
  idx: number; faces: Record<string, string>; start: number; end: number; dur: number; startFrame: number; endFrame: number; audio: string | null;
  /** the spoken words in video time (for mouthAt) */
  words: Word[];
};
export type Caption = { text: string; highlight: string; start: number; end: number; shot: string; speaker: string | null };
export type SpeakerTag = { name: string; colour: string };
export interface Timeline {
  story: StoryFile; FPS: number; WIDTH: number; HEIGHT: number; SHOTS: Shot[]; TOTAL: number; TOTAL_FRAMES: number;
  shotAt(time: number): { shot: Shot; local: number; p: number };
  byId(id: string): Shot;
  CAPTIONS: Caption[];
  captionAt(time: number): Caption | null;
  MUSIC: Timings["music"];
}
export function createTimeline(story: StoryFile, timings?: Timings | null): Timeline;
export function speakersOf<T extends SpeakerTag>(timeline: Timeline, roster: Record<string, T>): Record<string, T>;

// ---- camera
export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; shake: number; roll?: number };
export function V(x: number, y: number, z: number): THREE.Vector3;
export function move(from: [THREE.Vector3, THREE.Vector3], to: [THREE.Vector3, THREE.Vector3], p: number, fov?: number, shake?: number): Cam;
export function pushIn(subject: THREE.Vector3, dir: THREE.Vector3, far: number, near: number, p: number, fov?: number, lift?: number): Cam;
export function orbit(center: THREE.Vector3, radius: number, a0: number, a1: number, height: number, p: number, fov?: number): Cam;
export function follow(subject: THREE.Vector3, offset: THREE.Vector3, ahead?: THREE.Vector3, fov?: number): Cam;
export function lowAngle(subject: THREE.Vector3, dir: THREE.Vector3, dist?: number, fov?: number): Cam;
export function topDown(center: THREE.Vector3, height?: number, tilt?: number, fov?: number): Cam;
export function applyCamera(cam: THREE.PerspectiveCamera, c: Cam, frame: number): void;
export type FrameOpts = {
  /** direction from the subjects towards the camera (y tilts it) */ from?: THREE.Vector3; fov?: number; aspect?: number;
  /** where faces sit, from the top (0..1) */ faceY?: number;
  /** allowed face x range and y range (fractions) */ x?: [number, number]; y?: [number, number];
  /** bands faces must stay out of (the captions) */ avoid?: [number, number][];
  minDistance?: number; maxDistance?: number;
  /** fraction of the frame height a 1.2-stud head covers (0.1 = medium) */ size?: number;
  /** > 1 backs off further */ wide?: number;
  /** studs either side of each face kept inside the margins (shoulders, arms); default 1.6 */ body?: number;
};
export function frame(faces: THREE.Vector3[], o?: FrameOpts): Cam & { distance: number; screen: { x: number; y: number; z: number }[]; fits: boolean };
export function screenOf(points: THREE.Vector3[], pos: THREE.Vector3, forward: THREE.Vector3, fov: number, aspect: number): { x: number; y: number; z: number }[];

// ---- pose
export type Layer = { clip: any; at?: number; fade?: number; weight?: number; speed?: number };
export type Contacts = [string, number][];
export function poseAt(rig: any, layers: Layer[], t: number): void;
export function groundRig(rig: any, ground: number, contacts: Contacts): void;
export const FEET: Contacts;
export const KNEEL: Contacts;
export const SEAT: Contacts;
export const ON_SEAT: Contacts;
export type SurfaceHit = { y: number; name: string; material?: number; object: THREE.Object3D };
export interface Surfaces { at(x: number, z: number, o?: { below?: number; skip?: (o: THREE.Object3D) => boolean }): SurfaceHit | null }
/** A downward probe of the surfaces under root: Roblox map part boxes and solid meshes (noCollide things skipped). */
export function surfaces(root: THREE.Object3D): Surfaces;
/** Rest a rig on the surface under (x, z) (feet, or hips with ON_SEAT), sunk by its softness (restOn). */
export function placeOn(rig: any, ground: Surfaces, x: number, z: number, contacts?: Contacts, o?: { below?: number; skip?: (o: THREE.Object3D) => boolean }): SurfaceHit | null;

// ---- faces that follow the voice
export const EMOTION_FACE: Record<string, string>;
export function faceFor(emotion: string | undefined, fallback?: string): string;
/** Mouth openness 0..1 at time t: one open-close per syllable of the word being spoken. */
export function mouthAt(words: Word[] | undefined, t: number, o?: { strength?: number }): number;
/** Set the expression with the mouth opened by `open` (drawn faces: mouthOpen; dynamic heads: JawDrop). False for image faces. */
export function talk(rig: any, open: number, expressionName?: string): boolean;

// ---- surfaces
export type Surface = { name: string; sink: number };
export function surfaceOf(label: string, material?: number): Surface;
export function restOn(top: number, what: string, material?: number): number;

// ---- lighting
export type Daylight = { top: string; horizon: string; ground: string; sun: string; sunIntensity: number; sunDir: [number, number, number]; fill: number; exposure: number; stars: number };
export const LOOK: { toneMapping: THREE.ToneMapping; exposure: number; shadowMap: THREE.ShadowMapType; env: number; fill: number; avatar: number; sun: number };
export function applyLook(gl: THREE.WebGLRenderer): void;
export function avatarAmbient(obj: THREE.Object3D, amount?: number): void;
export const TIMES: Record<string, Daylight>;
export function daylight(name: string | undefined): Daylight;
export function mixDaylight(a: Daylight, b: Daylight, t: number): Daylight;
export type Lighting = {
  root: THREE.Group; sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; sky: THREE.Mesh;
  /** Apply a time of day (blend two with `mixDaylight`), overcast amount and lightning flash; focus = where shadows matter. */
  update(o: { time: Daylight; overcast?: number; flash?: number; focus?: THREE.Vector3 }): void;
};
export function createLighting(o?: { shadowSize?: number; shadowMap?: number; sky?: boolean }): Lighting;

// ---- Roblox maps
export type MapPart = {
  cls: string; name?: string; model?: string | null; size: number[]; cframe: { rot: number[]; pos: number[] }; color: number[]; material: number;
  transparency: number; reflectance: number; shape: number | null; mesh?: number; texture?: number; initialSize?: number[]; union?: number;
  modifier?: { cls: string; type: number; scale: number[]; offset: number[]; mesh?: number; texture?: number; vertexColor: number[] };
  decals?: { cls: string; face: number; image: number; transparency: number; color: number[]; studsU: number; studsV: number; offsetU: number; offsetV: number }[];
};
export type MapLight = { cls: string; at: number[]; rot: number[]; color: number[]; brightness: number; range: number; face: number; angle: number };
export type MapData = { parts: MapPart[]; lights: MapLight[] };
export type MapAssets = {
  /** asset id -> parsed .mesh (parseMesh) */
  meshes: Record<string, any>;
  /** asset id -> image (decals, textures, mesh textures) */
  images: Record<string, any>;
  /** a PBR set by name ("planks", "concrete", "grass", "asphalt"): its normal, roughness and colour maps are used */
  pbr?: (name: string) => THREE.MeshStandardMaterial;
};
export type MapOpts = {
  maxLights?: number; lightScale?: number; shadows?: boolean; skip?: (p: MapPart) => boolean;
  /** desk / table top unions drawn as one box over furniture: "trim" (default) to the part that clears it, "skip", or "box" (keep) */
  unions?: "trim" | "skip" | "box";
  /** false: don't console.warn about dropped unions */
  warn?: boolean;
};
export type MapCollider = { size: number[]; matrix: THREE.Matrix4; name: string; material?: number };
export type MaterialLook = { set?: string; tile?: number; rough: number; metal?: number; neon?: boolean; glass?: boolean };
export interface RobloxMap {
  group: THREE.Group; box: THREE.Box3; colliders: MapCollider[];
  /** unions left out because their box swallowed another model's furniture */
  dropped: { part: MapPart; box: THREE.Box3; standIn: MapPart | null }[];
  find(re: RegExp): THREE.Box3;
  names(): [string, number][];
}
export function buildRobloxMap(data: MapData, assets: MapAssets, o?: MapOpts): RobloxMap;
export function partGeometry(p: MapPart): THREE.BufferGeometry;
export function facePlane(size: number[], face: number): { g: THREE.PlaneGeometry; dims: [number, number] };
export function materialLook(material: number): MaterialLook;
export function swallowingUnions(parts: MapPart[]): MapPart[];
export function trimUnion(u: MapPart, parts: MapPart[]): MapPart | null;

// ---- staging check
export type Issue = { kind: "camera-inside" | "hidden" | "inside" | "floating" | "sunk" | "stiff" | "overlap" | "caption-over-face"; who: string; what: string; amount?: number };
export type Probed = { name: string; rig: { object: THREE.Object3D; jointPosition(n: string, t?: THREE.Vector3): THREE.Vector3 } };
export interface Probe {
  free(): void;
  colliders: number;
  solidAt(at: THREE.Vector3, exceptModel?: string | null): string | null;
  /** `captions`: the caption band as fractions of the frame height from the top, e.g. [0.62, 0.78] */
  check(camera: THREE.PerspectiveCamera, people: Probed[], o?: { captions?: [number, number] }): Issue[];
}
/** `R`: the `@dimforge/rapier3d-compat` namespace, initialised. */
export function createProbe(R: any, root: THREE.Object3D): Probe;
export function loadRapier<R = any>(importer: () => Promise<any>): Promise<R>;

// ---- boards
type Ctx = CanvasRenderingContext2D;
type Img = { width: number; height: number } | null | undefined;
export const BOARD_FONT: string;
export type Panel = THREE.Mesh & { set(key?: string, p?: number): boolean; canvas: HTMLCanvasElement };
export function setCanvasFactory(f: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas | any): void;
export function createCanvas(w: number, h: number): HTMLCanvasElement;
export function panel(w: number, h: number, px: number, draw: (g: Ctx, W: number, H: number, key: string, p: number) => void, o?: { emissive?: boolean }): Panel;
export function fill(g: Ctx, colour: string, W: number, H: number): void;
export function text(g: Ctx, s: string, x: number, y: number, size: number, colour: string, maxW?: number, o?: { align?: CanvasTextAlign; weight?: number; font?: string }): void;
export function coverFit(iw: number, ih: number, x: number, y: number, w: number, h: number, crop?: number): { x: number; y: number; w: number; h: number };
export function pic(g: Ctx, img: Img, x: number, y: number, w: number, h: number, o?: { round?: boolean; crop?: number; missing?: string }): void;
export function videoCard(g: Ctx, card: { thumb: Img; avatar: Img; title: string; channel: string; duration?: string; dark?: boolean; verified?: boolean }, x: number, y: number, w: number): number;
export function browserWindow(g: Ctx, W: number, H: number, tabs: string[], active?: number): { x: number; y: number; w: number; h: number };
export function banner(lines: string[], w: number, h: number, o?: { bg?: string; fg?: string; accent?: string; glow?: boolean }): Panel;
export function poster(img: Img, w: number, h: number, o?: { caption?: string; bg?: string; glow?: boolean }): Panel;
export function standee(art: CanvasImageSource & { width: number; height: number }, o?: { height?: number; border?: number; board?: string; foot?: string }): THREE.Group;

// ---- images
export function loadImage(src: string, o?: { Image?: any }): Promise<HTMLImageElement | null>;
export function loadImages<K extends string>(files: Record<K, string>, resolve?: (file: string) => string, o?: { Image?: any }): Promise<Record<K, HTMLImageElement | null>>;

// ---- layout plan
export type Shape = { type: "polygon"; points: [number, number][] };
export type PlanItem = { name: string; kind: "zone" | "area" | "footprint"; shape: Shape; color?: string; except?: string[] };
export function polygon(pts: [number, number][]): Shape;
export function rect(cx: number, cz: number, w: number, d: number, angle?: number): Shape;
export function circle(cx: number, cz: number, r: number, n?: number): Shape;
export function points(s: Shape): [number, number][];
export function inside(s: Shape, x: number, z: number): boolean;
export function intersects(a: Shape, b: Shape): boolean;
export class Plan {
  items: PlanItem[];
  zone(name: string, shape: Shape, color?: string): Shape;
  area(name: string, shape: Shape, color?: string): Shape;
  free(shape: Shape, except?: string[]): boolean;
  place(name: string, shape: Shape, o?: { force?: boolean; except?: string[]; color?: string }): boolean;
  scatter(area: Shape, o: { count: number; radius: number; gap?: number; rng: () => number; tries?: number; name?: string }): [number, number][];
  along(a: [number, number], b: [number, number], step: number, radius?: number): [number, number][];
  conflicts(): string[];
}

// ---- ground layers
export const LAYER_STEP: number;
export function layer<T extends THREE.Mesh>(mesh: T, n: number, base?: number): T;
export function groundConflicts(root: THREE.Object3D): string[];
export function checkGround(root: THREE.Object3D): void;

// ---- lights per location
export function lightsByLocation(root: THREE.Object3D, locations: Record<string, { x: number; z: number }>): { lamps: { light: THREE.Light; at: string }[]; show(location: string): void };

// ---- story documents
export const WEATHER_NAMES: string[];
export const LIGHT_PRESET_NAMES: string[];
export type StoryCheckOpts = { expressions?: string[]; weather?: string[]; times?: string[]; emotions?: string[]; lights?: string[]; themes?: string[] };
export function parseStory(md: string): { front: Record<string, string>; shots: (StoryShot & Record<string, any>)[]; errors: string[] };
export function parseAudio(md: string): { voice: StoryFile["voice"] & Record<string, any>; music: { theme: string; fromShot: string }[] };
export function checkStory(story: { shots: (StoryShot & Record<string, any>)[]; music?: { theme: string; fromShot: string }[] }, o?: StoryCheckOpts): { errors: string[]; warnings: string[]; words: number };
export function compileStory(storyMd: string, audioMd?: string, o?: StoryCheckOpts): { story: StoryFile; errors: string[]; warnings: string[]; words: number };

// ---- frame zones of a vertical short
export const ZONES: { captions: [number, number]; buttons: { x: [number, number]; y: [number, number] }; bottom: number; top: number };
/** The band a watched face must stay out of while a caption shows. */
export function captionBand(top?: number): [number, number];
