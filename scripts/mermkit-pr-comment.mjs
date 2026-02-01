import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const eventPath = process.env.GITHUB_EVENT_PATH;
const token = process.env.GITHUB_TOKEN;

if (!eventPath) {
  console.log("GITHUB_EVENT_PATH missing; skipping");
  process.exit(0);
}

if (!token) {
  console.log("GITHUB_TOKEN missing; skipping");
  process.exit(0);
}

const event = JSON.parse(readFileSync(eventPath, "utf8"));
const pr = event.pull_request;
if (!pr) {
  console.log("Not a pull_request event; skipping");
  process.exit(0);
}

const owner = pr.base.repo.owner.login;
const repo = pr.base.repo.name;
const number = pr.number;

const { extractDiagrams, normalizeDiagram } = await import(
  new URL("../packages/core/dist/index.js", import.meta.url)
);
const { render } = await import(new URL("../packages/render/dist/index.js", import.meta.url));

const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

async function gh(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function listPrFiles() {
  const files = [];
  let page = 1;
  while (true) {
    const pageData = await gh(`/pulls/${number}/files?per_page=100&page=${page}`);
    if (!Array.isArray(pageData) || pageData.length === 0) break;
    files.push(...pageData);
    if (pageData.length < 100) break;
    page += 1;
  }
  return files;
}

function isMarkdown(pathname) {
  return pathname.endsWith(".md") || pathname.endsWith(".mdx") || pathname.endsWith(".markdown");
}

const files = await listPrFiles();
const targets = files
  .map((file) => file.filename)
  .filter((name) => isMarkdown(name) || name.endsWith(".mmd"));

if (targets.length === 0) {
  console.log("No markdown or mmd files changed; skipping");
  process.exit(0);
}

const diagrams = [];
for (const filename of targets) {
  const fullPath = join(root, filename);
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, "utf8");
  if (filename.endsWith(".mmd")) {
    diagrams.push({
      id: filename.replace(/[^a-zA-Z0-9_-]/g, "_"),
      source: normalizeDiagram(content),
      file: filename
    });
  } else {
    const extracted = extractDiagrams(content);
    extracted.forEach((diagram, idx) => {
      diagrams.push({
        id: `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}-${idx + 1}`,
        source: diagram.source,
        file: filename
      });
    });
  }
}

if (diagrams.length === 0) {
  console.log("No mermaid diagrams found; skipping");
  process.exit(0);
}

const outDir = join(root, "pr-diagrams");
mkdirSync(outDir, { recursive: true });

const rendered = [];
for (const diagram of diagrams) {
  try {
    const result = await render(
      { id: diagram.id, source: diagram.source },
      { format: "svg", engine: "auto", background: "transparent" }
    );
    const hash = createHash("sha256").update(diagram.source).digest("hex").slice(0, 8);
    const fileName = `${diagram.id}-${hash}.svg`;
    const filePath = join(outDir, fileName);
    writeFileSync(filePath, Buffer.from(result.bytes));
    rendered.push({
      ...diagram,
      fileName,
      mime: result.mime,
      bytes: Buffer.from(result.bytes),
      warnings: result.warnings
    });
  } catch (error) {
    rendered.push({
      ...diagram,
      fileName: null,
      mime: "",
      bytes: Buffer.from(""),
      warnings: [error instanceof Error ? error.message : String(error)]
    });
  }
}

const marker = "<!-- mermkit-bot -->";
let body = `${marker}\n## Mermaid diagrams\n\n`;
body += `Rendered ${rendered.length} diagram(s). Full SVGs are uploaded as workflow artifacts.\n\n`;

for (const [index, entry] of rendered.entries()) {
  body += `### ${entry.file} (diagram ${index + 1})\n`;
  if (entry.fileName && entry.bytes.length > 0) {
    const encoded = entry.bytes.toString("base64");
    const dataUrl = `data:${entry.mime};base64,${encoded}`;
    if (dataUrl.length < 120000) {
      body += `<details><summary>Preview</summary>\n\n<img src="${dataUrl}" alt="${entry.file}" />\n\n</details>\n\n`;
    } else {
      body += `Preview too large for inline embedding. See workflow artifacts: ${entry.fileName}.\n\n`;
    }
  }
  if (entry.warnings && entry.warnings.length > 0) {
    body += `Warnings: ${entry.warnings.join("; ")}\n\n`;
  }
  body += "```mermaid\n" + entry.source + "\n```\n\n";
}

const comments = await gh(`/issues/${number}/comments?per_page=100`);
const existing = comments.find((comment) =>
  typeof comment.body === "string" && comment.body.includes(marker)
);

if (existing) {
  await gh(`/issues/comments/${existing.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body })
  });
  console.log("Updated existing mermkit comment");
} else {
  await gh(`/issues/${number}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body })
  });
  console.log("Posted new mermkit comment");
}
