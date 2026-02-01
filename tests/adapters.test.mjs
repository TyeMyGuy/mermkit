import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { root } from "./helpers.mjs";

export async function testAdapters() {
  const adaptersPath = join(root, "packages", "adapters", "dist", "index.js");
  const adapters = await import(pathToFileURL(adaptersPath));
  const diagram = { id: "d1", source: "graph TD; A-->B" };
  const image = { bytes: new Uint8Array([1, 2, 3]), mime: "image/png", filename: "diagram.png" };

  const slack = adapters.formatSlackMessage(diagram, { image, altText: "Test" });
  assert.equal(slack.target, "slack");
  assert.ok(slack.payload.blocks.length > 0);

  const discord = adapters.formatDiscordMessage(diagram, { image });
  assert.equal(discord.target, "discord");
  assert.ok(discord.payload.embeds.length > 0);

  const github = adapters.formatGitHubComment(diagram, { image });
  assert.equal(github.target, "github");
  assert.ok(github.payload.body.includes("mermaid"));
}
