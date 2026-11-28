import type * as THREE from "three";

export type PostOpts = { ao: number; aoRadius: number; bloom: number; bloomThreshold: number; msaa: number };
export const POST_DEFAULTS: PostOpts;
export type Post = { composer: any; set(p: Partial<PostOpts>): void; render(seconds?: number): void; dispose(): void };
export function createPost(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number, o?: PostOpts): Post;
/** Inside the ThreeCanvas tree, once: renders the scene through the effects. */
export function usePost(o?: PostOpts, enabled?: boolean): Post | null;
