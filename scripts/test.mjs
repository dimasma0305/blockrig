// Cross-platform test runner: node --test over test/*.test.js. `--update` rewrites regression snapshots.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const files = readdirSync("test").filter((f) => f.endsWith(".test.js")).sort().map((f) => `test/${f}`);
const env = { ...process.env };
if (process.argv.includes("--update")) env.UPDATE_SNAPSHOTS = "1";
const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...files], { stdio: "inherit", env });
process.exit(r.status ?? 1);
