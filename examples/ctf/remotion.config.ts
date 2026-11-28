// Remotion CLI settings. https://remotion.dev/docs/config
import { Config } from "@remotion/cli/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// assets/ is the public folder: staticFile("audio/s01.wav") -> assets/audio/s01.wav
Config.setPublicDir("assets");
// WebGL through ANGLE so shadows render in headless Chrome the same as in Studio
Config.setChromiumOpenGlRenderer("angle");
// 8 frames at a time: measured fastest on a 24-core laptop with an RTX 4060 (2: 108 s, 8: 27 s, 12: 30 s per 180 frames)
Config.setConcurrency(8);

// BlockRig is linked from ../.. and has its own node_modules/three; make every import of "three" resolve to
// this project's copy so there is exactly one three.js in the bundle.
Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: { ...c.resolve, alias: { ...(c.resolve?.alias as object), three: path.resolve("node_modules/three") } },
}));

// Windows: if the project path is too long for the bundled browser to start, put the path of a copy of
// chrome-headless-shell.exe in a file named .browser-path
if (existsSync(".browser-path")) Config.setBrowserExecutable(readFileSync(".browser-path", "utf8").trim());
