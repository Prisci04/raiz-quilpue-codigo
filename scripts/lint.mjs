import { spawnSync } from "node:child_process";

const verde = "\x1b[32m";
const rojo = "\x1b[31m";
const reset = "\x1b[0m";

const result = spawnSync("npx", ["eslint"], {
  stdio: "inherit",
  shell: true,
});

if (result.status === 0) {
  console.log(`${verde}ESLint sin errores${reset}`);
  process.exit(0);
}

console.error(`${rojo}ESLint encontró errores${reset}`);
process.exit(result.status ?? 1);
