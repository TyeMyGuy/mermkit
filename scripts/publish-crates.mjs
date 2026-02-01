import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cwd = join(root, "bindings", "rust");

const res = spawnSync("cargo", ["publish"], { cwd, stdio: "inherit" });
if (res.status !== 0) process.exit(res.status ?? 1);
