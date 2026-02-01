import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const cliPath = join(root, "packages", "cli", "dist", "cli.js");

export async function runCli(args, { input, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn("node", [cliPath, ...args], {
      env: { ...process.env, ...env }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

export async function mkTempDir(prefix = "mermkit-test-") {
  return mkdtemp(join(tmpdir(), prefix));
}

export function hasCommand(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, ["--version"]);
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function findPython() {
  if (await hasCommand("python3")) return "python3";
  if (await hasCommand("python")) return "python";
  return null;
}
