import { rm } from "node:fs/promises";
import { join } from "node:path";

const roots = ["packages/core", "packages/render", "packages/cli", "packages/adapters"];

await Promise.all(
  roots.map(async (root) => {
    const dist = join(root, "dist");
    await rm(dist, { recursive: true, force: true });
  })
);
