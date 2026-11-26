// Builds dist/blockrig.umd.js (+ .min.js): a browser script that exposes `window.BlockRig` and uses the
// global `THREE` from a <script src=".../three.min.js"> tag. ESM users import src/ directly.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const globalThree = {
  name: "global-three",
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: "three", namespace: "global-three" }));
    b.onLoad({ filter: /.*/, namespace: "global-three" }, () => ({ contents: "module.exports = globalThis.THREE;", loader: "js" }));
  },
};
const banner = { js: `/*! blockrig v${version} | MIT | https://github.com/dimasma0305/blockrig */` };
for (const minify of [false, true]) {
  await build({
    entryPoints: ["src/index.js"], bundle: true, format: "iife", globalName: "BlockRig", platform: "browser",
    target: ["es2019"], plugins: [globalThree], banner, minify, sourcemap: minify,
    outfile: `dist/blockrig.umd${minify ? ".min" : ""}.js`, logLevel: "info",
  });
}
