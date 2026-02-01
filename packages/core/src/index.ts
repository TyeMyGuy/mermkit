export type Diagram = {
  id: string;
  source: string;
  title?: string;
  lang?: string;
  meta?: Record<string, string>;
};

export type ExtractOptions = {
  fenceLangs?: string[];
  keepFenceLang?: boolean;
};

// Extract Mermaid diagrams from markdown text.
export function extractDiagrams(markdownText: string, options: ExtractOptions = {}): Diagram[] {
  const fenceLangs = (options.fenceLangs ?? ["mermaid", "mmd", "mermkit"]).map((l) => l.toLowerCase());
  const lines = normalizeLineEndings(markdownText).split("\n");
  const diagrams: Diagram[] = [];

  let inFence = false;
  let fenceMarker = "";
  let fenceLang = "";
  let fenceMeta: Record<string, string> | undefined;
  let buffer: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!inFence) {
      const open = parseFenceOpen(line);
      if (open && fenceLangs.includes(open.lang.toLowerCase())) {
        inFence = true;
        fenceMarker = open.marker;
        fenceLang = open.lang;
        fenceMeta = open.meta;
        buffer = [];
      }
      continue;
    }

    if (isFenceClose(line, fenceMarker)) {
      const source = normalizeDiagram(buffer.join("\n"));
      const id = `diagram-${diagrams.length + 1}`;
      diagrams.push({
        id,
        source,
        lang: options.keepFenceLang ? fenceLang : undefined,
        meta: fenceMeta
      });
      inFence = false;
      fenceMarker = "";
      fenceLang = "";
      fenceMeta = undefined;
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  return diagrams;
}

// Normalize diagram source (line endings, trimming, etc.).
export function normalizeDiagram(source: string): string {
  const normalized = normalizeLineEndings(source);
  const lines = normalized.split("\n");
  const trimmedLines = trimBlankEdges(lines).map((line) => line.replace(/[ \t]+$/g, ""));
  return trimmedLines.join("\n");
}

// Validate diagram source for basic safety checks.
export function validateDiagram(source: string): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const lower = source.toLowerCase();

  if (lower.includes("http://") || lower.includes("https://")) {
    warnings.push("diagram contains URLs; remote resources are disabled by default");
  }

  if (lower.includes("%%{")) {
    warnings.push("diagram contains init directives; ensure renderer enforces safe config");
  }

  return { ok: warnings.length === 0, warnings };
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseFenceOpen(line: string): { marker: string; lang: string; meta?: Record<string, string> } | null {
  const match = /^(\s*)(```+|~~~+)(.*)$/.exec(line);
  if (!match) return null;

  const marker = match[2];
  const info = match[3].trim();
  if (!info) return null;

  const [lang, ...rest] = info.split(/\s+/);
  const meta = parseInfoMeta(rest.join(" "));
  return { marker, lang, meta };
}

function parseInfoMeta(info: string): Record<string, string> | undefined {
  if (!info) return undefined;
  const meta: Record<string, string> = {};
  const tokens = tokenizeInfo(info);
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq === -1) continue;
    const key = token.slice(0, eq).trim();
    const rawValue = token.slice(eq + 1).trim();
    const value = unquote(rawValue);
    if (key) meta[key] = value;
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function tokenizeInfo(info: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;

  for (let i = 0; i < info.length; i += 1) {
    const ch = info[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "\"" || ch === "'") {
      quote = ch as "\"" | "'";
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

function unquote(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function isFenceClose(line: string, marker: string): boolean {
  if (!marker) return false;
  const trimmed = line.trim();
  return trimmed.startsWith(marker);
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start += 1;
  while (end > start && lines[end - 1].trim() === "") end -= 1;
  return lines.slice(start, end);
}
