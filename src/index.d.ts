import type * as THREE from "three";

export type CFrame = { rot: number[]; pos: number[] };
/** A parsed mesh (parseMesh) or a three.js BufferGeometry. */
export type MeshInput = Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "lods" | "faceCount"> | THREE.BufferGeometry;
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
  /** How the handle draws its mesh: SpecialMesh.Scale / Offset, or a MeshPart's Size / InitialSize (pass both to addAccessory). */
  scale: number[]; offset: number[];
  layered: { order: number; cageMeshId: number | null; referenceMeshId: number | null; cageOrigin: number[]; referenceOrigin: number[] } | null;
  /** SurfaceAppearance.ColorMap, where modern layered clothing keeps its colour texture. */
  colorMapId: number | null;
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
  /**
   * Dress the rig in a skinned layered-clothing mesh. With `wrap` (the WrapLayer's cages) and a body that has
   * WrapTarget cages (bodyParts[*].cage), the garment is fitted to the body first, and layers stack by Order.
   */
  addLayeredClothing(mesh: ParsedMesh, o?: { map?: THREE.Texture | null; color?: THREE.ColorRepresentation; lod?: number; side?: THREE.Side; wrap?: WrapLayerSpec | null }): THREE.SkinnedMesh;
  /** The body's WrapTarget cages in character space (template UV key -> position). */
  readonly bodyCage: Map<string, number[]>;
  /** `scale` / `offset`: how the handle draws its mesh (from describeAccessory): SpecialMesh.Scale / Offset, or a MeshPart's Size / InitialSize. */
  addAccessory(mesh: MeshInput, o: { attachment: { name: string; cframe: CFrame }; map?: THREE.Texture | null; color?: THREE.ColorRepresentation; scale?: number[] | null; offset?: number[] | null }): THREE.Mesh;
  setFace(image: CanvasImageSource): void;
  readonly headAttachments: Record<string, number[]>;
  setHead(mesh: MeshInput, o?: { scale?: number[]; offset?: number[]; attachments?: Record<string, number[]>; map?: THREE.Texture | null; color?: THREE.ColorRepresentation }): THREE.Mesh;
  headBounds(): THREE.Box3;
  readonly face: Face | null;
  /** Show another face image (instant, like replacing a face Decal's Texture). */
  setExpression(name: string): Rig;
  updateFace(dt?: number): void;
  addFaceDecal(face: Face, o?: { radius?: number; height?: number; arc?: number; y?: number; segments?: number }): THREE.Mesh;
  readonly bodyAttachments: Record<string, BodyAttachment>;
  /** Weld an object to a body part (or "Head"): Object = Part * C0 * C1^-1, like a Weld. */
  weld<T extends THREE.Object3D>(object: T, partName: string, o?: { c0?: CFrame | THREE.Matrix4 | null; c1?: CFrame | THREE.Matrix4 | null }): T;
  /** Put the object's attachment on a body or head attachment, like a RigidConstraint. */
  attachTo<T extends THREE.Object3D>(object: T, attachmentName: string, objectAttachment?: CFrame | THREE.Matrix4 | null): T;
  /** Humanoid:EquipTool: RightGrip weld, C0 = RightGripAttachment, C1 = Tool.Grip. `object` is the Handle. */
  equipTool<T extends THREE.Object3D>(object: T, o?: { grip?: CFrame | THREE.Matrix4 | null }): T;
  unequipTool(): THREE.Object3D | null;
  readonly tool: THREE.Object3D | null;
  unweld<T extends THREE.Object3D>(object: T): T;
  readonly welds: Map<THREE.Object3D, string>;
  /** A body part's bind-pose CFrame in character space (its centre), like Part.CFrame. */
  partCFrame(name: string): CFrame;
  /** Cast and/or receive shadows on every mesh (outlines never cast), now and for parts added later. */
  setShadows(cast?: boolean, receive?: boolean): Rig;
  /** Advance faces and IK without an Animator. */
  update(dt?: number): Rig;
  /** A new rig built the same way (welded objects cloned); pass options to change some, e.g. { face }. */
  clone(over?: Parameters<typeof createRig>[0]): Rig;
  /** Free the rig's geometries, materials and own textures, and take it out of the scene. */
  dispose(o?: { welds?: boolean }): void;
  /** Humanoid.HipHeight: the root part's bottom above the ground when standing (R6: above its legs). Settable. */
  hipHeight: number;
  /** Add an IKControl (solved after the Animator on every update). */
  addIKControl(o: IKControlSpec): IKControl;
  removeIKControl(c: IKControl): void;
  readonly ikControls: IKControl[];
  /** Apply the IKControls to the current pose. */
  solveIK(): void;
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
  setBodyPart(partName: string, mesh: MeshInput, o?: { map?: THREE.Texture | null; color?: THREE.ColorRepresentation; scale?: number[] }): THREE.Mesh;
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
export function describeBodyParts(roots: RbxInstance[], o?: { folder?: string }): Record<string, { meshId: number | null; textureId: number | null; size: number[] | null; attachments: Record<string, number[]>; cage: { meshId: number | null; origin: number[] } | null }>;
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
export interface CageMesh { positions: ArrayLike<number>; uvs: ArrayLike<number> }
export interface WrapLayerSpec { inner: CageMesh; innerOrigin?: number[]; outer?: CageMesh; outerOrigin?: number[]; order?: number }
export interface BodyPartSpec {
  mesh?: MeshInput;
  /** The part's WrapTarget cage (CageMeshId) and CageOrigin, for fitting layered clothing. */
  cage?: { mesh: CageMesh; origin?: number[] } | null;
  size?: number[]; attachments?: Record<string, AttachmentPos>; map?: ClothingImage | null;
  /** "template" (default): classic clothing is projected onto the mesh; "mesh": keep the mesh's own UVs */
  uvs?: "template" | "mesh";
}
export type BodyRegion = "Head" | "Torso" | "LeftArm" | "RightArm" | "LeftLeg" | "RightLeg";
export interface BodyAttachment { part: string; pos: number[]; rot?: number[] | null }
export const ATTACHMENT_ROT: Record<string, number[]>;

export function createRig(o?: {
  rigType?: RigType;
  bodyParts?: Record<string, BodyPartSpec>;
  bodyColors?: BodyColors;
  clothing?: Clothing;
  /** cast and receive shadows (outlines never cast) */
  shadows?: boolean | { cast?: boolean; receive?: boolean };
  shape?: ShapeName | Partial<ShapeSpec>;
  scale?: BodyScale;
  skeleton?: BindBone[];
  body?: { skin?: string; shirt?: string; pants?: string; shoes?: string } | false;
  face?: CanvasImageSource | Face | null;
  outline?: number;
}): Rig;
/** Roblox classic head edge rounding (studs). */
export const HEAD_CORNER: number;
/** How far face accessories are lifted off the head (studs), so their low-poly facets never dip into it. */
export const FACE_LIFT: number;
export function headGeometry(height?: number, radius?: number, corner?: number): THREE.BufferGeometry;
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
/** toolHold: Roblox's "toolnone" (right arm forward) for a tool from rig.equipTool: a +Y-up handle stands upright. */
export const clips: Record<"idle" | "wave" | "showtime" | "run" | "card" | "victory" | "toolHold", Clip>;
export function makeCoat(o?: { slices?: number; length?: number; puff?: number; tails?: boolean }): ParsedMesh;
export function lz4Block(src: Uint8Array, outLen: number): Uint8Array;
export type ExpressionName = "neutral" | "happy" | "grin" | "laugh" | "smug" | "wink" | "determined" | "angry" | "furious" | "roar" | "shocked" | "scared" | "sad" | "hurt" | "sleepy" | "embarrassed" | "dazed";
/** A classic Roblox face Decal: its Texture is one of `images`; set() replaces it instantly. */
export interface Face {
  isFace: true; canvas: HTMLCanvasElement | null; name: string | null; images: Record<string, CanvasImageSource>; background: string | null;
  set(name: string): Face;
  readonly usingImage: true;
  onChange(fn: (face: Face) => void): Face;
  update(): boolean;
  draw(): Face;
}
export function createFace(o?: { images?: Record<string, CanvasImageSource>; expression?: string; size?: number; background?: string | null; canvas?: HTMLCanvasElement }): Face;
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
/** FaceControls presets for the drawn expression names (happy, sad, shocked, ...), for dynamic heads. */
export const FACS_EXPRESSIONS: Record<string, Partial<Record<FaceControlName, number>>>;
/** FaceControls values (every control, 0 when unused) for an expression name; `amount` scales it. */
export function facsExpression(name: string, amount?: number): Record<FaceControlName, number>;
export function cageKey(u: number, v: number): string;
export function cageMap(cage: CageMesh, o?: { origin?: number[]; at?: number[]; scale?: number[]; into?: Map<string, number[]> }): Map<string, number[]>;
export function fitLayer(positions: ArrayLike<number>, layer: WrapLayerSpec, target: Map<string, number[]>, o?: { k?: number; normals?: ArrayLike<number> | null; inflate?: number }): { positions: Float32Array; target: Map<string, number[]>; matched: number };
export type KeyInterpolation = "Constant" | "Linear" | "Cubic";
export interface FloatCurveKey { t: number; value: number; interpolation: KeyInterpolation; tangentMode: number; leftTangent: number; rightTangent: number }
export interface RotationCurveKey { t: number; q: [number, number, number, number]; interpolation: KeyInterpolation; leftTangent: number; rightTangent: number }
export const TICKS_PER_SECOND: number;
export const KEY_INTERPOLATION: Record<number, KeyInterpolation>;
export const ROTATION_ORDER: Record<number, "XYZ" | "XZY" | "YZX" | "YXZ" | "ZXY" | "ZYX">;
/** FloatCurve.ValuesAndTimes (bytes, or the string a reader gave) -> keys. */
export function decodeFloatCurve(bytes: Uint8Array | string): FloatCurveKey[];
export function decodeRotationCurve(bytes: Uint8Array | string): RotationCurveKey[];
export function decodeMarkerCurve(bytes: Uint8Array | string): { t: number; value: string }[];
export function evalFloatCurve(keys: FloatCurveKey[], t: number): number;
export function evalRotationCurve(keys: RotationCurveKey[], t: number, out?: THREE.Quaternion): THREE.Quaternion;
/** CurveAnimation -> clip (curves sampled at fps, default 60, plus every key time). */
export function curveAnimationToClip(roots: RbxInstance[], o?: { name?: string; rigType?: RigType; fps?: number }): Clip;
export function describeTool(roots: RbxInstance[]): {
  name: string; grip: CFrame; requiresHandle: boolean;
  handle: { className: string; size: number[] | null; meshId: number | null; textureId: number | null; scale: number[]; offset: number[] } | null;
};
export type IKTarget = THREE.Vector3 | THREE.Object3D | (() => THREE.Vector3);
export interface IKControlSpec {
  type?: "Position" | "Rotation" | "Transform" | "LookAt";
  /** the first joint of the chain, e.g. "RightUpperArm" */
  chainRoot: string;
  /** a part (its centre) or a body/head attachment, e.g. "RightHand" or "RightGripAttachment" */
  endEffector: string;
  /** world position (Vector3), an Object3D (position and, for Rotation/Transform, orientation) or a function */
  target: IKTarget | null;
  /** bends the chain towards this point (world) */
  pole?: IKTarget | null;
  weight?: number; priority?: number; enabled?: boolean; iterations?: number;
  /** offset from the target (pos in the target's frame when it's an Object3D) */
  offset?: CFrame | null;
}
export type IKControl = Required<Pick<IKControlSpec, "type" | "weight" | "priority" | "enabled" | "iterations">> & IKControlSpec;
export function solvePosition(chain: THREE.Bone[], effector: () => THREE.Vector3, target: THREE.Vector3, o?: { iterations?: number; tolerance?: number }): void;
export function applyPole(chain: THREE.Bone[], effector: () => THREE.Vector3, pole: THREE.Vector3): void;
export function solveRotation(bone: THREE.Object3D, worldQ: THREE.Quaternion): void;
export function solveLookAt(chain: THREE.Object3D[], origin: () => THREE.Vector3, forward: () => THREE.Vector3, target: THREE.Vector3): void;
export function meshFromGeometry(geometry: THREE.BufferGeometry): ParsedMesh;
export const BRICK_COLORS: Record<number, [string, number, number, number]>;
export function brickColorHex(n: number): string | null;
export const VERSION: string;
