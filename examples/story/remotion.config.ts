// Remotion CLI settings. https://remotion.dev/docs/config
import { Config } from "@remotion/cli/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// WebGL through ANGLE so shadows and post-processing render in headless Chrome
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(2);

// BlockRig is linked from ../.. and has its own node_modules/three; make every import of "three" resolve to
// this project's copy so there is exactly one three.js in the bundle.
Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: { ...c.resolve, alias: { ...(c.resolve?.alias as object), three: path.resolve("node_modules/three") } },
}));

// Windows: if the project path is too long for the bundled browser to start, put the path of a copy of
// chrome-headless-shell.exe in a file named .browser-path
if (existsSync(".browser-path")) {
  Config.setBrowserExecutable(readFileSync(".browser-path", "utf8").trim());
}
