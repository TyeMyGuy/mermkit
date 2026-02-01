import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const versionIndex = args.findIndex((arg) => arg === "--version" || arg === "-v");
const versionArg = versionIndex >= 0 ? args[versionIndex + 1] : undefined;

const rootPkgPath = join(root, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
const version = versionArg ?? rootPkg.version;

if (!version || typeof version !== "string") {
  throw new Error("version missing; pass --version x.y.z or set in root package.json");
}

if (versionArg && rootPkg.version !== version) {
  rootPkg.version = version;
  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
}

const packagesDir = join(root, "packages");
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesDir, entry.name));

for (const dir of packageDirs) {
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  const fields = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  for (const field of fields) {
    if (!pkg[field]) continue;
    for (const name of Object.keys(pkg[field])) {
      if (name.startsWith("@mermkit/")) pkg[field][name] = version;
    }
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

const pyprojectPath = join(root, "bindings", "python", "pyproject.toml");
let pyproject = readFileSync(pyprojectPath, "utf8");
pyproject = pyproject.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
writeFileSync(pyprojectPath, pyproject);

const cargoPath = join(root, "bindings", "rust", "Cargo.toml");
let cargo = readFileSync(cargoPath, "utf8");
cargo = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
writeFileSync(cargoPath, cargo);

console.log(`synced version ${version}`);
