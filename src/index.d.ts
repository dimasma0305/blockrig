import type * as THREE from "three";

export type CFrame = { rot: number[]; pos: number[] };
export interface MeshBone { name: string; parent: number; lodParent: number; culling: number; cframe: CFrame }
export interface ParsedMesh {
  version: string; vertexCount: number; faceCount: number;
  positions: Float32Array; normals: Float32Array; uvs: Float32Array; colors: Uint8Array | null;
  indices: Uint32Array; lods: number[]; bones: MeshBone[];
  skinIndex: Uint16Array | null; skinWeight: Float32Array | null;
  subsets: { facesBegin: number; facesLength: number; vertsBegin: number; vertsLength: number; boneIndices: number[] }[];
  facs: Uint8Array | null;
}
export interface DracoResult { positions: Float32Array; normals?: Float32Array; uvs?: Float32Array; colors?: Uint8Array; indices: Uint32Array }
export function parseMesh(input: ArrayBuffer | ArrayBufferView, options?: { decodeDraco?: (bytes: Uint8Array) => DracoResult }): ParsedMesh;
export function lodIndices(mesh: ParsedMesh, level?: number): Uint32Array;
export function writeMesh(mesh: Partial<ParsedMesh> & Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "vertexCount" | "faceCount">, version?: "2.00" | "3.00" | "4.00" | "6.00"): Uint8Array;

export interface RbxInstance { className: string; ref: number; props: Record<string, any>; children: RbxInstance[]; parent: RbxInstance | null }
export function parseRbxm(input: ArrayBuffer | ArrayBufferView | string, options?: { zstd?: (compressed: Uint8Array, size: number) => Uint8Array }): RbxInstance[];
export function parseRbxmx(text: string): RbxInstance[];
export function findInstance(roots: RbxInstance[], pred: (x: RbxInstance) => boolean): RbxInstance | null;
export function assetId(content: unknown): number | null;
export function describeHead(roots: RbxInstance[]): { meshId: number | null; textureId: number | null; meshType: number | null; scale: number[]; offset: number[]; attachments: Record<string, number[]> };
export function describeAccessory(roots: RbxInstance[]): {
  name: string; meshId: number | null; textureId: number | null;
  attachment: { name: string; cframe: CFrame } | null;
  layered: { order: number; cageMeshId: number | null; referenceMeshId: number | null } | null;
};

export function cframeToMatrix(cf: CFrame | number[], target?: THREE.Matrix4): THREE.Matrix4;
export function matrixToCFrame(m: THREE.Matrix4): CFrame;
export function motor6D(part0: THREE.Matrix4, c0: THREE.Matrix4, transform: THREE.Matrix4, c1: THREE.Matrix4): THREE.Matrix4;
export function accessoryWeld(bodyPart: THREE.Matrix4, bodyAttachment: THREE.Matrix4, handleAttachment: THREE.Matrix4): THREE.Matrix4;

export interface BindBone { name: string; parent: string | null; pos: number[]; rot: number[] }
export const R15_BIND: BindBone[];
export const R15_JOINTS: string[];
export const R15_FLOOR: number;
export const R15_NECK_Y: number;
export const HEAD_ATTACHMENTS: Record<string, number[]>;

export type JointName =
  | "HumanoidRootPart" | "LowerTorso" | "UpperTorso" | "Neck"
  | "LeftUpperArm" | "LeftLowerArm" | "LeftHand" | "RightUpperArm" | "RightLowerArm" | "RightHand"
  | "LeftUpperLeg" | "LeftLowerLeg" | "LeftFoot" | "RightUpperLeg" | "RightLowerLeg" | "RightFoot"
  | "Torso" | "Left Arm" | "Right Arm" | "Left Leg" | "Right Leg" | "Head";
export type Pose = Partial<Record<JointName, [number, number, number]>> & { rootOffset?: [number, number, number] };

export interface Rig {
  object: THREE.Group; stage: THREE.Group; bones: Record<string, THREE.Bone>; neck: THREE.Bone; head: THREE.Group;
  parts: Record<string, THREE.Mesh>; joints: string[]; rigType: RigType; body: Body; garments: THREE.SkinnedMesh[]; accessories: THREE.Mesh[];
  setJointQuat(name: string, q: THREE.Quaternion): boolean;
  setJoint(name: string, x?: number, y?: number, z?: number): boolean;
  nudgeJoint(name: string, x?: number, y?: number, z?: number): boolean;
  setRootOffset(x?: number, y?: number, z?: number): void;
  setJointOffset(name: string, x?: number, y?: number, z?: number): boolean;
  resetPose(): void;
  setPose(pose: Pose): void;
  jointPosition(name: string, target?: THREE.Vector3): THREE.Vector3;
  addLayeredClothing(mesh: ParsedMesh, o?: { map?: THREE.Texture | null; color?: THREE.ColorRepresentation; lod?: number; side?: THREE.Side }): THREE.SkinnedMesh;
  addAccessory(mesh: Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "lods" | "faceCount">, o: { attachment: { name: string; cframe: CFrame }; map?: THREE.Texture | null; color?: THREE.ColorRepresentation }): THREE.Mesh;
  setFace(image: CanvasImageSource): void;
  readonly headAttachments: Record<string, number[]>;
  setHead(mesh: Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "lods" | "faceCount">, o?: { scale?: number[]; offset?: number[]; attachments?: Record<string, number[]>; map?: THREE.Texture | null; color?: THREE.ColorRepresentation }): THREE.Mesh;
  headBounds(): THREE.Box3;
  readonly face: Face | null;
  setExpression(nameOrParams: ExpressionName | string | Partial<FaceParams>, o?: { fade?: number }): Rig;
  updateFace(dt: number): void;
  addFaceDecal(face: Face, o?: { radius?: number; height?: number; arc?: number; y?: number; segments?: number }): THREE.Mesh;
  readonly bodyAttachments: Record<string, BodyAttachment>;
  /** Roblox FaceControls (50 values, 0..1) driving a dynamic head. */
  faceControls: Record<FaceControlName, number>;
  /** True once setHead() was given a dynamic (FACS) head mesh. */
  readonly dynamicHead: boolean;
  /** Pose the dynamic head from faceControls; returns true if it changed. The Animator calls it each update. */
  applyFaceControls(): boolean;
  setClothing(c: Clothing): Rig;
  setBodyColors(c: BodyColors): Rig;
  refreshAvatar(): Rig;
  readonly avatar: { bodyColors: Record<BodyRegion, string>; clothing: Clothing } | null;
  setBodyPart(partName: string, mesh: Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "lods" | "faceCount">, o?: { map?: THREE.Texture | null; color?: THREE.ColorRepresentation; scale?: number[] }): THREE.Mesh;
}
export type RigType = "R15" | "R6";
export type ShapeName = "classic" | "slender" | "buff" | "tall" | "child";
export interface ShapeSpec { top: number; waist: number; depth: number; arm: number; leg: number; legX: number; limbs: number; torso: number }
export interface BodyScale { height?: number; width?: number; depth?: number; head?: number }
export interface BodyPart { bone: string; size: number[]; center: number[]; kind: "shirt" | "pants" | "skin" | "shoes"; taper?: number; hand?: number; shoe?: number }
export interface Body { rigType: RigType; bind: BindBone[]; parts: BodyPart[]; floor: number; neck: { parent: string; pos: number[] }; headScale: number; scale?: Required<BodyScale> }
export const R15_SHAPES: Record<ShapeName, ShapeSpec>;
export function buildBody(o?: { rigType?: RigType; shape?: ShapeName | Partial<ShapeSpec>; scale?: BodyScale }): Body;
export function jointsOf(body: Body): string[];

export const R15_JOINT_OF: Record<string, string>;
export const BODY_REGION: Record<string, BodyRegion>;
export const BODY_COLOR_KEYS: string[];
export function defaultR15Parts(): Record<string, { size: number[]; attachments: Record<string, number[]>; kind?: string; taper?: number }>;
export function buildBodyFromParts(parts?: Record<string, { size?: number[]; attachments?: Record<string, AttachmentPos> }>, o?: { scale?: BodyScale }): Body & { attachments: Record<string, BodyAttachment> };
export function defaultBodyAttachments(body: Body): Record<string, BodyAttachment>;
export function describeBodyParts(roots: RbxInstance[], o?: { folder?: string }): Record<string, { meshId: number | null; textureId: number | null; size: number[] | null; attachments: Record<string, number[]> }>;
export function describeBodyColors(roots: RbxInstance[]): Partial<Record<"HeadColor3" | "TorsoColor3" | "LeftArmColor3" | "RightArmColor3" | "LeftLegColor3" | "RightLegColor3", string>>;
export function describeClothing(roots: RbxInstance[]): { shirt: number | null; pants: number | null; tshirt: number | null };
export const TEMPLATE_SIZE: [number, number];
export const TEMPLATE: Record<"Torso" | "RightLimb" | "LeftLimb", Record<"F" | "B" | "L" | "R" | "U" | "D", [number, number, number, number]>>;
export const T_SHIRT_RECT: [number, number, number, number];
export function templateUVs(positions: ArrayLike<number>, normals: ArrayLike<number>, size: number[], region: Exclude<BodyRegion, "Head">, slice?: [number, number]): Float32Array;
export function regionSlices(parts: BodyPart[]): Record<string, [number, number]>;
export function clothingLayers(region: BodyRegion): ("pants" | "shirt" | "tshirt")[];
export function paintRegion(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, region: BodyRegion, color: string, clothing?: { shirt?: CanvasImageSource; pants?: CanvasImageSource; tshirt?: CanvasImageSource }, partImage?: CanvasImageSource | null): void;
export function toR6(clip: Clip): Clip;
export function toR15(clip: Clip): Clip;
export function retargetAll<T extends Record<string, Clip>>(clips: T, fn: (c: Clip) => Clip): Record<keyof T, Clip>;

export type BodyColors = Partial<Record<"HeadColor3" | "TorsoColor3" | "LeftArmColor3" | "RightArmColor3" | "LeftLegColor3" | "RightLegColor3", THREE.ColorRepresentation | [number, number, number]>>;
export type ClothingImage = CanvasImageSource | THREE.Texture;
export interface Clothing { shirt?: ClothingImage | null; pants?: ClothingImage | null; tshirt?: ClothingImage | null }
export type AttachmentPos = [number, number, number] | number[] | CFrame;
export interface BodyPartSpec {
  mesh?: Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "lods" | "faceCount">;
  size?: number[]; attachments?: Record<string, AttachmentPos>; map?: ClothingImage | null;
  /** "template" (default): classic clothing is projected onto the mesh; "mesh": keep the mesh's own UVs */
  uvs?: "template" | "mesh";
}
export type BodyRegion = "Head" | "Torso" | "LeftArm" | "RightArm" | "LeftLeg" | "RightLeg";
export interface BodyAttachment { part: string; pos: number[] }

export function createRig(o?: {
  rigType?: RigType;
  bodyParts?: Record<string, BodyPartSpec>;
  bodyColors?: BodyColors;
  clothing?: Clothing;
  shape?: ShapeName | Partial<ShapeSpec>;
  scale?: BodyScale;
  skeleton?: BindBone[];
  body?: { skin?: string; shirt?: string; pants?: string; shoes?: string } | false;
  face?: CanvasImageSource | Face | null;
  outline?: number;
}): Rig;
export function headGeometry(height?: number, radius?: number): THREE.LatheGeometry;
export function faceTexture(image: CanvasImageSource | null, skin?: string): THREE.CanvasTexture | null;
export function loadRobloxTexture(url: string, loader?: THREE.TextureLoader): THREE.Texture;
export function setSRGB<T extends THREE.Texture>(tex: T): T;

export type EasingStyle = "Linear" | "Constant" | "Cubic" | "Elastic" | "Bounce";
export type EasingDirection = "In" | "Out" | "InOut";
export type Priority = "Core" | "Idle" | "Movement" | "Action" | "Action2" | "Action3" | "Action4";
export interface Clip {
  name: string; length?: number; loop?: boolean; priority?: Priority;
  keyframes: { t: number; poses: Record<string, { r?: [number, number, number]; q?: [number, number, number, number]; p?: [number, number, number]; weight?: number; ease?: EasingStyle; dir?: EasingDirection }>; faces?: Partial<Record<FaceControlName, number | { v: number; ease?: EasingStyle; dir?: EasingDirection; weight?: number }>> }[];
  markers?: { t: number; name: string; value?: string; fade?: number; kind?: "marker" | "keyframe" }[];
}
export interface Connection { disconnect(): void }
export class Signal<A extends unknown[] = []> {
  connect(fn: (...args: A) => void): Connection;
  once(fn: (...args: A) => void): Connection;
  fire(...args: A): void;
}
/** A clip loaded on an Animator, like Roblox's AnimationTrack. */
export class AnimationTrack {
  readonly animator: Animator; readonly clip: Clip; readonly name: string; readonly length: number;
  /** Current time in seconds; set it to seek (clamped to 0..length; markers in between don't fire). */
  timePosition: number;
  looped: boolean; priority: Priority;
  readonly speed: number; readonly isPlaying: boolean; readonly weightCurrent: number; readonly weightTarget: number;
  /** Fired when stop() is called or a non-looped track reaches its end. */
  readonly stopped: Signal;
  /** Fired once the track has fully faded out. */
  readonly ended: Signal;
  readonly didLoop: Signal;
  readonly keyframeReached: Signal<[string]>;
  play(fadeTime?: number, weight?: number, speed?: number): this;
  stop(fadeTime?: number): this;
  /** Negative speeds play backwards. */
  adjustSpeed(speed?: number): this;
  /** Fade from the current weight to `weight` over `fadeTime` seconds. */
  adjustWeight(weight?: number, fadeTime?: number): this;
  getTimeOfKeyframe(name: string): number;
  getMarkerReachedSignal(name: string): Signal<[string]>;
  /** @deprecated use timePosition */ time: number;
  /** @deprecated use weightCurrent */ weight: number;
}
/** @deprecated use AnimationTrack */
export type Track = AnimationTrack;
export class Animator {
  constructor(rig: Rig);
  rig: Rig; tracks: AnimationTrack[];
  /** A track that isn't playing yet (Animator:LoadAnimation). */
  loadAnimation(clip: Clip): AnimationTrack;
  /** Play a clip (restarts it if it's already playing). */
  play(clip: Clip, o?: { fade?: number; weight?: number; speed?: number }): AnimationTrack;
  stop(clipOrName?: Clip | string, fade?: number): void;
  isPlaying(name: string): boolean;
  getPlayingAnimationTracks(): AnimationTrack[];
  onMarker(fn: (name: string, clip: Clip, value?: string) => void): void;
  update(dt: number): void;
}
export function ease(style: EasingStyle, dir: EasingDirection, t: number): number;
export const PRIORITY: Record<Priority, number>;
export const clips: Record<"idle" | "wave" | "showtime" | "run" | "card" | "victory", Clip>;
export function makeCoat(o?: { slices?: number; length?: number; puff?: number; tails?: boolean }): ParsedMesh;
export function lz4Block(src: Uint8Array, outLen: number): Uint8Array;
export type FaceParams = {
  eyeOpen: number; eyeSize: number; squint: number; whites: number; lookX: number; lookY: number; wink: number; wince: number; ko: number;
  brows: number; browAngle: number; browY: number;
  mouthCurve: number; mouthOpen: number; mouthWidth: number; mouthSkew: number; teeth: number; tongue: number;
  blush: number; sweat: number; tears: number;
};
export type ExpressionName = "neutral" | "happy" | "grin" | "laugh" | "smug" | "wink" | "determined" | "angry" | "furious" | "roar" | "shocked" | "scared" | "sad" | "hurt" | "sleepy" | "embarrassed" | "dazed";
export const FACE_DEFAULTS: Readonly<FaceParams>;
export const EXPRESSIONS: Readonly<Record<ExpressionName, Partial<FaceParams>>>;
export function expression(nameOrParams: ExpressionName | Partial<FaceParams>, base?: FaceParams): FaceParams;
export function mixFace(a: FaceParams, b: FaceParams, t: number): FaceParams;
export interface FaceStyle { size?: number; ink?: string; eyeColor?: string | null; glow?: string | null; background?: string | null }
export function drawFace(ctx: CanvasRenderingContext2D, params: Partial<FaceParams>, style?: FaceStyle): void;
export interface Face {
  isFace: true; canvas: HTMLCanvasElement | null; name: string; current: FaceParams; target: FaceParams;
  set(nameOrParams: ExpressionName | string | Partial<FaceParams>, o?: { fade?: number }): Face;
  readonly usingImage: boolean;
  images: Record<string, CanvasImageSource>;
  lookAt(x?: number, y?: number): Face;
  talk(on?: boolean): Face;
  onChange(fn: (face: Face) => void): Face;
  params(): FaceParams;
  update(dt: number): boolean;
  draw(): Face;
}
export function createFace(o?: FaceStyle & { canvas?: HTMLCanvasElement; blink?: boolean; expression?: ExpressionName | string | Partial<FaceParams>; seed?: number; images?: Record<string, CanvasImageSource>; imageOffset?: number }): Face;
export function createFaceDecal(face: Face, o?: { radius?: number; height?: number; arc?: number; y?: number; segments?: number }): THREE.Mesh;
export const POSE_EASING_STYLE: Record<number, string>;
export const POSE_EASING_DIRECTION: Record<number, EasingDirection>;
export const ANIMATION_PRIORITY: Record<number, Priority>;
export const R6_C0_ROTATIONS: Record<string, number[]>;
export function keyframeSequenceToClip(roots: RbxInstance[], o?: { name?: string; rigType?: RigType; cubicLegacy?: "runtime" | "named" }): Clip;
export type FaceControlName =
  | "ChinRaiser" | "ChinRaiserUpperLip" | "Corrugator" | "EyesLookDown" | "EyesLookLeft" | "EyesLookRight" | "EyesLookUp" | "FlatPucker" | "Funneler"
  | "JawDrop" | "JawLeft" | "JawRight" | "LipPresser" | "LipsTogether" | "LowerLipSuck" | "MouthLeft" | "MouthRight" | "Pucker" | "TongueDown" | "TongueOut" | "TongueUp" | "UpperLipSuck"
  | `${"Left" | "Right"}${"BrowLowerer" | "CheekPuff" | "CheekRaiser" | "Dimpler" | "EyeClosed" | "EyeUpperLidRaiser" | "InnerBrowRaiser" | "LipCornerDown" | "LipCornerPuller" | "LowerLipDepressor" | "LipStretcher" | "NoseWrinkler" | "OuterBrowRaiser" | "UpperLipRaiser"}`;
export const FACE_CONTROLS: FaceControlName[];
export const FACS_CODES: Record<string, FaceControlName>;
export interface Facs {
  bones: string[]; codes: string[]; controls: string[]; twoPose: number[][]; threePose: number[][]; rows: number; cols: number;
  px: Float32Array; py: Float32Array; pz: Float32Array; rx: Float32Array; ry: Float32Array; rz: Float32Array;
}
export function parseFacs(bytes: Uint8Array): Facs;
export function facsWeights(facs: Facs, values: Partial<Record<string, number>>): Float32Array;
export function facsBoneOffsets(facs: Facs, values: Partial<Record<string, number>>, out?: Float32Array): Float32Array;
export const VERSION: string;
