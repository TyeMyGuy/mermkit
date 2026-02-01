import assert from "node:assert/strict";
import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { cliPath, mkTempDir, findPython, hasCommand, root } from "./helpers.mjs";

function runCommand(cmd, args, env, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

export async function testWrappers() {
  const tempDir = await mkTempDir();
  const shimPath = join(tempDir, "mermkit-shim");
  const shim = `#!/bin/sh\nexec node ${cliPath} "$@"\n`;
  await writeFile(shimPath, shim, "utf8");
  await chmod(shimPath, 0o755);

  const python = await findPython();
  if (python) {
    const code = `import os, sys\n` +
      `sys.path.insert(0, "${join(root, "bindings", "python")}")\n` +
      `from mermkit import render\n` +
      `res = render("graph TD; A-->B", format="svg", engine="stub")\n` +
      `assert res.bytes.startswith(b"<?xml")\n` +
      `print("ok")\n`;
    const result = await runCommand(python, ["-c", code], { MERMKIT_BIN: shimPath });
    assert.equal(result.code, 0);
  }

  if (await hasCommand("go")) {
    const result = await runCommand("go", ["test", "./bindings/go"], { MERMKIT_BIN: shimPath });
    assert.equal(result.code, 0);
  }

  if (await hasCommand("cargo")) {
    const result = await runCommand(
      "cargo",
      ["test"],
      { MERMKIT_BIN: shimPath, CARGO_TERM_COLOR: "never" },
      join(root, "bindings", "rust")
    );
    assert.equal(result.code, 0);
  }
}
