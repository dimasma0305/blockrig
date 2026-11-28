import type { Pack, PackMissing, PackRef, PackStore } from "./index.js";

export interface PackCache extends PackStore {
  dir: string;
  putBundle(id: number, details: unknown): void;
  path(id: number, format?: string | null): string;
  putAsset(id: number, format: string | null, bytes: Uint8Array): void;
  links(): Record<string, string>;
  /** `{ key: url }`, or the browser script's text ("key url" per line) */
  addLinks(more: Record<string, string> | string): number;
  dropLink(key: string): void;
  details(type: string, id: number | string): any | null;
  putDetails(type: string, id: number | string, details: unknown): void;
  dropDetails(type: string, id: number | string): void;
}
export function defaultCacheDir(): string;
export function packCache(dir?: string): PackCache;
export function fillPack(ref: PackRef, cache: PackCache, o?: { fetch?: typeof fetch; decodeDraco?: (b: Uint8Array) => any; log?: (msg: string) => void; refresh?: boolean }): Promise<{ pack: Pack | null; partial: Pack; missing: PackMissing[] }>;
export function locateScript(missing: PackMissing[]): string;
/** A 127.0.0.1 link server for browserLoop (a normal browser; the in-app browser blocks pages from calling it). */
export function linkServer(cache: PackCache, needs: () => PackMissing[] | null, o?: { port?: number }): { url: string; ready: Promise<void>; waitForLinks(ms?: number): Promise<{ added: number; fails: string | null } | null>; close(): void };
export function browserLoop(url: string): string;
export function exportPack(pack: Pack, cache: PackCache, dir: string): string;
export { parsePackRef } from "./index.js";
