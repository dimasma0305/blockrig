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
export function parseRbxm(input: ArrayBuffer | ArrayBufferView, options?: { zstd?: (compressed: Uint8Array, size: number) => Uint8Array }): RbxInstance[];
export function findInstance(roots: RbxInstance[], pred: (x: RbxInstance) => boolean): RbxInstance | null;
export function assetId(content: unknown): number | null;
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
  | "LeftUpperLeg" | "LeftLowerLeg" | "LeftFoot" | "RightUpperLeg" | "RightLowerLeg" | "RightFoot";
export type Pose = Partial<Record<JointName, [number, number, number]>> & { rootOffset?: [number, number, number] };

export interface Rig {
  object: THREE.Group; stage: THREE.Group; bones: Record<string, THREE.Bone>; neck: THREE.Bone; head: THREE.Group;
  parts: Record<string, THREE.Mesh>; joints: string[]; garments: THREE.SkinnedMesh[]; accessories: THREE.Mesh[];
  setJointQuat(name: string, q: THREE.Quaternion): boolean;
  setJoint(name: string, x?: number, y?: number, z?: number): boolean;
  nudgeJoint(name: string, x?: number, y?: number, z?: number): boolean;
  setRootOffset(x?: number, y?: number, z?: number): void;
  resetPose(): void;
  setPose(pose: Pose): void;
  jointPosition(name: string, target?: THREE.Vector3): THREE.Vector3;
  addLayeredClothing(mesh: ParsedMesh, o?: { map?: THREE.Texture | null; color?: THREE.ColorRepresentation; lod?: number; side?: THREE.Side }): THREE.SkinnedMesh;
  addAccessory(mesh: Pick<ParsedMesh, "positions" | "normals" | "uvs" | "indices" | "lods" | "faceCount">, o: { attachment: { name: string; cframe: CFrame }; map?: THREE.Texture | null; color?: THREE.ColorRepresentation }): THREE.Mesh;
  setFace(image: CanvasImageSource): void;
}
export function createRig(o?: {
  skeleton?: BindBone[];
  body?: { skin?: string; shirt?: string; pants?: string; shoes?: string } | false;
  face?: CanvasImageSource | null;
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
  keyframes: { t: number; poses: Record<string, { r?: [number, number, number]; p?: [number, number, number]; ease?: EasingStyle; dir?: EasingDirection }> }[];
  markers?: { t: number; name: string }[];
}
export interface Track { clip: Clip; time: number; weight: number; target: number; fade: number; speed: number }
export class Animator {
  constructor(rig: Rig);
  rig: Rig; tracks: Track[];
  play(clip: Clip, o?: { fade?: number; weight?: number; speed?: number }): Track;
  stop(clipOrName?: Clip | string, fade?: number): void;
  isPlaying(name: string): boolean;
  onMarker(fn: (name: string, clip: Clip) => void): void;
  update(dt: number): void;
}
export function ease(style: EasingStyle, dir: EasingDirection, t: number): number;
export const PRIORITY: Record<Priority, number>;
export const clips: Record<"idle" | "wave" | "showtime" | "run" | "card" | "victory", Clip>;
export function makeCoat(o?: { slices?: number; length?: number; puff?: number; tails?: boolean }): ParsedMesh;
export function lz4Block(src: Uint8Array, outLen: number): Uint8Array;
export const VERSION: string;
