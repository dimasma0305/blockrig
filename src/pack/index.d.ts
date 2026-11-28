import type * as THREE from "three";
import type { ParsedMesh, RbxInstance, Rig, CFrame } from "../index.js";

export type PackRef = string | number | { bundle?: number | string; asset?: number | string; outfit?: number | string; user?: number | string };
export type PackRole = "body" | "head" | "face" | "clothing" | "accessory" | "animation" | "model";
export type PackFile = { id: number; format: string | null };
export type PackMissing = { kind: "bundle"; id: number; key: string } | { kind: "details"; type: "outfit" | "user" | "username"; id: number | string; key: string } | { kind: "asset"; id: number; format: string | null; key: string };
export interface PackStore {
  /** catalog bundle details (https://catalog.roblox.com/v1/bundles/{id}/details), or null if not cached */
  bundle(id: number): { name?: string; bundleType?: string; items?: { id: number; name?: string; type: string; assetType?: number }[] } | null;
  /** an asset's file as delivered (Roblox-AssetFormat `format` when given), or null if not cached */
  asset(id: number, format: string | null): Uint8Array | null;
  /** outfit / user avatar details (avatar.roblox.com) and username lookups `{ id }`; falls back to bundle() for bundles */
  details?(type: "bundle" | "outfit" | "user" | "username", id: number | string): any | null;
}
export type PackBodyColors = Partial<Record<"HeadColor3" | "TorsoColor3" | "LeftArmColor3" | "RightArmColor3" | "LeftLegColor3" | "RightLegColor3", string>>;
export type PackScale = { height: number; width: number; depth: number; head: number; proportion: number; bodyType: number };
export interface Pack {
  ref: string; key: string; name: string | null; bundleType: string | null;
  items: { id: number; name: string | null; assetType: number | null; role: PackRole | null; error?: string }[];
  body: Record<string, { mesh: number | null; texture: number | null; size: number[] | null; attachments: Record<string, number[]>; cage: { mesh: number | null; origin: number[] } | null }>;
  head: { id: number; mesh: number | null; texture: number | null; kind: "meshpart" | "special"; dynamic: boolean; size: number[] | null; scale: number[]; offset: number[]; attachments: Record<string, number[]> } | null;
  face: number | null;
  clothing: { shirt?: number; pants?: number; tshirt?: number };
  accessories: { id: number; name: string | null; type: string | null; mesh: number | null; texture: number | null; attachment: { name: string; cframe: CFrame } | null; scale: number[]; offset: number[];
    layered: { order: number; cage: number | null; reference: number | null; cageOrigin: number[]; referenceOrigin: number[] } | null }[];
  /** by slot: idle, walk, run, jump, fall, climb, swim, mood, emote, animation (or the pack's own StringValue names) */
  animations: Record<string, { id: number; weight: number; name: string | null }[]>;
  map: { parts: any[]; lights: any[] } | null;
  /** every file the pack needs at runtime */
  files: PackFile[];
  /** from the outfit or the player's avatar: BodyColors, scales, R6/R15 */
  bodyColors: PackBodyColors | null; scale: PackScale | null; rigType: "R6" | "R15" | null;
  /** user packs: the player's id */
  userId: number | string | null;
}
export interface LoadedPack {
  pack: Pack;
  bodyParts: Record<string, { mesh: ParsedMesh; size: number[] | null; attachments: Record<string, number[]>; map?: THREE.Texture; cage: { mesh: ParsedMesh; origin: number[] } | null }>;
  head: (Omit<NonNullable<Pack["head"]>, "mesh"> & { mesh: ParsedMesh; map: THREE.Texture | null }) | null;
  face: any | null;
  clothing: { shirt?: any; pants?: any; tshirt?: any };
  accessories: (Omit<Pack["accessories"][number], "mesh" | "layered"> & { mesh: ParsedMesh; map: THREE.Texture | null; layered: { order: number; cage: ParsedMesh | null; reference: ParsedMesh | null; cageOrigin: number[]; referenceOrigin: number[] } | null })[];
  clips: Record<string, { clip: any; weight: number; name: string | null }[]>;
  /** the heaviest clip of a slot, or null */
  clip(slot: string): any | null;
  /** ready for blockrig/video buildRobloxMap(data, { meshes, images }) */
  map: { data: { parts: any[]; lights: any[] }; meshes: Record<string, ParsedMesh>; images: Record<string, any> } | null;
}

export const ASSET_TYPES: Record<number, string>;
export function roleOf(assetType: number | null | undefined): PackRole | null;
export function parsePackRef(ref: PackRef): { type: "bundle" | "asset" | "outfit" | "user"; id: number | string; key: string };
export function avatarBodyColors(details: any): PackBodyColors | null;
export function avatarScale(details: any): PackScale | null;
export function fileKey(id: number, format?: string | null): string;
export function resolvePack(ref: PackRef, store: PackStore, o?: { zstd?: (b: Uint8Array) => Uint8Array; name?: string; assetType?: number }): { pack: Pack | null; partial: Pack; missing: PackMissing[] };
export function loadPack(pack: Pack, io: { bytes(id: number, format: string | null): Promise<Uint8Array>; image?(id: number): Promise<any>; decodeDraco?: (b: Uint8Array) => any; zstd?: (b: Uint8Array) => Uint8Array }): Promise<LoadedPack>;
export function wearPack(rig: Rig, loaded: LoadedPack): THREE.Object3D[];
export function rigFromPack(loaded: LoadedPack, o?: Record<string, any>): Rig;
export function describeMap(roots: RbxInstance[]): { parts: any[]; lights: any[]; refs: { meshes: Set<number>; images: Set<number> } };
