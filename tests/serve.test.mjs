import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cliPath } from "./helpers.mjs";

export async function testServeIntegration() {
  const child = spawn("node", [cliPath, "serve"], {
    env: { ...process.env }
  });

  let buffer = "";
  const queue = [];

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.length === 0) continue;
      const resolver = queue.shift();
      if (resolver) resolver(JSON.parse(line));
    }
  });

  const send = (payload) => {
    return new Promise((resolve) => {
      queue.push(resolve);
      child.stdin.write(JSON.stringify(payload) + "\n");
    });
  };

  const schema = await send({ id: "schema", action: "schema", format: "generic" });
  assert.equal(schema.ok, true);
  assert.ok(schema.result.tools.length > 0);

  const batch = await send({
    id: "batch",
    action: "renderBatch",
    diagrams: [
      { id: "a", source: "graph TD; A-->B" },
      { id: "b", source: "graph TD; B-->C" }
    ],
    options: { format: "svg", engine: "stub" }
  });
  assert.equal(batch.ok, true);
  assert.equal(batch.result.results.length, 2);
  assert.equal(batch.result.results[0].ok, true);

  const extract = await send({
    id: "extract",
    action: "extract",
    markdown: "```mermaid\ngraph TD; A-->B\n```"
  });
  assert.equal(extract.ok, true);
  assert.equal(extract.result.diagrams.length, 1);

  child.kill();
}
