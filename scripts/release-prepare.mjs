import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const versionIndex = args.findIndex((arg) => arg === "--version" || arg === "-v");
const version = versionIndex >= 0 ? args[versionIndex + 1] : null;
const notesIndex = args.findIndex((arg) => arg === "--notes");
const notes = notesIndex >= 0 ? args[notesIndex + 1] : null;

if (!version) {
  throw new Error("release-prepare requires --version x.y.z");
}

const sync = spawnSync("node", ["scripts/sync-version.mjs", "--version", version], {
  cwd: root,
  stdio: "inherit"
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

const changelogPath = join(root, "CHANGELOG.md");
let changelog = readFileSync(changelogPath, "utf8");

const today = new Date();
const date = today.toISOString().slice(0, 10);
const entryHeader = `## [${version}] - ${date}`;

if (!changelog.includes("## [Unreleased]")) {
  changelog = `# Changelog\n\n## [Unreleased]\n\n` + changelog;
}

const insertAt = changelog.indexOf("## [Unreleased]") + "## [Unreleased]\n\n".length;
const entryBody = `- ${notes ?? "Initial release"}\n\n`;
const next = `${entryHeader}\n\n${entryBody}`;

changelog = changelog.slice(0, insertAt) + next + changelog.slice(insertAt);
writeFileSync(changelogPath, changelog);

console.log(`release prepared for ${version}`);
