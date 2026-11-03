// Runs a script with Electron's bundled Node instead of the system Node,
// so native modules built for Electron (better-sqlite3) load correctly.
//   node scripts/run-with-electron.js <script> [args...]
const { spawnSync } = require("child_process");
const electron = require("electron"); // path to the Electron binary

const [script, ...args] = process.argv.slice(2);
const result = spawnSync(electron, [script, ...args], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
});
process.exit(result.status ?? 1);
