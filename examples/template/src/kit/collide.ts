// The staging check (`npm run collide`) lives in BlockRig (blockrig/video: createProbe, tested there). The video
// only brings Rapier, its own dependency: loadRapier() loads its WASM once per browser tab.
import type RAPIER_NS from "@dimforge/rapier3d-compat";
import { loadRapier as load } from "blockrig/video";

export { createProbe, type Issue, type Probed, type Probe } from "blockrig/video";
export const loadRapier = (): Promise<typeof RAPIER_NS> => load<typeof RAPIER_NS>(() => import("@dimforge/rapier3d-compat"));
