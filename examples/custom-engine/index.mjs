import { registerEngine, render } from "../../packages/render/dist/index.js";

registerEngine({
  id: "demo-engine",
  priority: 50,
  render: async (diagram, options) => {
    const text = `Custom engine output for: ${diagram.id}`;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120">` +
      `<rect width="100%" height="100%" fill="white"/>` +
      `<text x="16" y="40" font-size="16" font-family="monospace">${text}</text>` +
      `<text x="16" y="70" font-size="12" font-family="monospace">format=${options.format}</text>` +
      `</svg>`;
    return {
      bytes: new TextEncoder().encode(svg),
      mime: "image/svg+xml",
      warnings: ["demo-engine used"]
    };
  }
});

const diagram = { id: "demo", source: "graph TD; A-->B" };
const result = await render(diagram, { format: "svg", engine: "demo-engine" });

process.stdout.write(result.bytes);
