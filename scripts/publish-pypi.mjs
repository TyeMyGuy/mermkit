import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cwd = join(root, "bindings", "python");
const python = process.env.PYTHON ?? "python3";
const venvDir = join(tmpdir(), "mermkit-pypi-venv");
const venvPython = process.platform === "win32"
  ? join(venvDir, "Scripts", "python.exe")
  : join(venvDir, "bin", "python");

const venv = spawnSync(python, ["-m", "venv", venvDir], { cwd, stdio: "inherit" });
if (venv.status !== 0) process.exit(venv.status ?? 1);

const bootstrap = spawnSync(venvPython, ["-m", "pip", "install", "--upgrade", "build", "twine"], { cwd, stdio: "inherit" });
if (bootstrap.status !== 0) process.exit(bootstrap.status ?? 1);

const build = spawnSync(venvPython, ["-m", "build"], { cwd, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const upload = spawnSync(venvPython, ["-m", "twine", "upload", "dist/*"], { cwd, stdio: "inherit" });
if (upload.status !== 0) process.exit(upload.status ?? 1);
