import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkTempDir, runCli } from "./helpers.mjs";

export async function testCliIntegration() {
  const tempDir = await mkTempDir();
  const diagramPath = join(tempDir, "diagram.mmd");
  await writeFile(diagramPath, "graph TD; A-->B", "utf8");

  const outPath = join(tempDir, "diagram.svg");
  const manifestPath = join(tempDir, "manifest.json");
  const renderRes = await runCli([
    "render",
    "--in",
    diagramPath,
    "--out",
    outPath,
    "--format",
    "svg",
    "--engine",
    "stub",
    "--out-manifest",
    manifestPath
  ]);
  assert.equal(renderRes.code, 0);
  const svg = await readFile(outPath, "utf8");
  assert.ok(svg.includes("<svg"));

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.count, 1);
  assert.equal(manifest.entries[0].output, outPath);
  assert.equal(manifest.entries[0].inputHash.length, 64);

  const mdPath = join(tempDir, "diagram.md");
  await writeFile(mdPath, "```mermaid\ngraph TD; A-->B\n```", "utf8");
  const extractOut = join(tempDir, "diagrams");
  const extractRes = await runCli(["extract", "--in", mdPath, "--out-dir", extractOut]);
  assert.equal(extractRes.code, 0);

  const schemaRes = await runCli(["tool-schema", "--format", "openai"]);
  assert.equal(schemaRes.code, 0);
  const schema = JSON.parse(schemaRes.stdout);
  assert.ok(Array.isArray(schema));

  const stdoutManifest = join(tempDir, "manifest-stdout.json");
  const renderStdout = await runCli([
    "render",
    "--in",
    diagramPath,
    "--format",
    "svg",
    "--engine",
    "stub",
    "--out-manifest",
    stdoutManifest
  ]);
  assert.equal(renderStdout.code, 0);
  const stdoutManifestJson = JSON.parse(await readFile(stdoutManifest, "utf8"));
  assert.equal(stdoutManifestJson.entries[0].output, "<stdout>");

  const asciiRes = await runCli([
    "render",
    "--in",
    diagramPath,
    "--format",
    "ascii"
  ]);
  assert.equal(asciiRes.code, 0);
  assert.ok(asciiRes.stdout.includes("A"));
  assert.ok(asciiRes.stdout.includes("B"));
}
