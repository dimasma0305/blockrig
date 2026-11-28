// The webpack override every bundle of this video uses (stills, collide; remotion.config.ts does the same for the
// CLI): BlockRig is linked from ../.. and its parts import three, react, remotion, postprocessing...: all of them
// resolve from this project, so there is exactly one copy of each in the bundle.
import path from "node:path";

export const webpackOverride = (c) => ({
  ...c,
  resolve: { ...c.resolve, modules: [path.resolve("node_modules"), "node_modules"], alias: { ...(c.resolve?.alias ?? {}), three: path.resolve("node_modules/three") } },
});
