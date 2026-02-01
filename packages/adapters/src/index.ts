import type { Diagram } from "@mermkit/core";

export type ChatTarget = "slack" | "discord" | "github" | "generic";

export type ChatImage = {
  bytes: Uint8Array;
  mime: string;
  filename?: string;
};

export type AdapterResult<TPayload = Record<string, unknown>> = {
  target: ChatTarget;
  payload: TPayload;
  files?: ChatImage[];
  markdown?: string;
  meta?: Record<string, unknown>;
};

export type ChatPayload<TPayload = Record<string, unknown>> = AdapterResult<TPayload>;

export type SlackPayload = {
  text?: string;
  blocks?: unknown[];
};

export type DiscordPayload = {
  content?: string;
  embeds?: unknown[];
};

export type GitHubPayload = {
  body: string;
};

export type GenericPayload = {
  text?: string;
  markdown?: string;
};

export type ChatFormatOptions = {
  image?: ChatImage;
  altText?: string;
  includeCodeBlock?: boolean;
  title?: string;
};

export function formatForChat(
  diagram: Diagram,
  target: ChatTarget,
  options: ChatFormatOptions = {}
): ChatPayload {
  switch (target) {
    case "slack":
      return formatSlackMessage(diagram, options);
    case "discord":
      return formatDiscordMessage(diagram, options);
    case "github":
      return formatGitHubComment(diagram, options);
    case "generic":
    default:
      return formatGenericMessage(diagram, options);
  }
}

export function formatGenericMessage(
  diagram: Diagram,
  options: ChatFormatOptions = {}
): AdapterResult<GenericPayload> {
  const markdown = options.includeCodeBlock === false ? undefined : toMermaidCode(diagram.source);
  const payload: GenericPayload = {
    text: options.title ?? "Mermaid diagram",
    markdown
  };
  return {
    target: "generic",
    payload,
    files: options.image ? [ensureFilename(options.image)] : undefined,
    markdown,
    meta: options.image ? { requiresUpload: true } : undefined
  };
}

export function formatSlackMessage(
  diagram: Diagram,
  options: ChatFormatOptions = {}
): AdapterResult<SlackPayload> {
  const blocks: unknown[] = [];
  const code = options.includeCodeBlock === false ? undefined : toMermaidCode(diagram.source);

  if (code) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: code }
    });
  }

  if (options.image) {
    const filename = options.image.filename ?? "diagram.png";
    blocks.push({
      type: "image",
      image_url: `attachment://${filename}`,
      alt_text: options.altText ?? "Mermaid diagram",
      title: options.title ? { type: "plain_text", text: options.title } : undefined
    });
  }

  const payload: SlackPayload = {
    text: options.title ?? "Mermaid diagram",
    blocks: blocks.length > 0 ? blocks : undefined
  };

  return {
    target: "slack",
    payload,
    files: options.image ? [ensureFilename(options.image)] : undefined,
    markdown: code,
    meta: options.image ? { requiresUpload: true } : undefined
  };
}

export function formatDiscordMessage(
  diagram: Diagram,
  options: ChatFormatOptions = {}
): AdapterResult<DiscordPayload> {
  const content = options.includeCodeBlock === false ? undefined : toMermaidCode(diagram.source);
  const embeds: unknown[] = [];

  if (options.image) {
    const filename = options.image.filename ?? "diagram.png";
    embeds.push({
      title: options.title,
      image: { url: `attachment://${filename}` },
      description: options.altText
    });
  }

  const payload: DiscordPayload = {
    content,
    embeds: embeds.length > 0 ? embeds : undefined
  };

  return {
    target: "discord",
    payload,
    files: options.image ? [ensureFilename(options.image)] : undefined,
    markdown: content
  };
}

export function formatGitHubComment(
  diagram: Diagram,
  options: ChatFormatOptions = {}
): AdapterResult<GitHubPayload> {
  const code = options.includeCodeBlock === false ? "" : `${toMermaidCode(diagram.source)}\n\n`;
  const filename = options.image?.filename ?? "diagram.png";
  const markdown = options.image
    ? `${code}![Mermaid diagram](<upload_url>)`
    : code.trim() || undefined;

  return {
    target: "github",
    payload: { body: markdown ?? "" },
    files: options.image ? [ensureFilename({ ...options.image, filename })] : undefined,
    markdown,
    meta: options.image ? { imageFilename: filename, needsUploadUrl: true } : undefined
  };
}

function toMermaidCode(source: string): string {
  return `\`\`\`mermaid\n${source}\n\`\`\``;
}

function ensureFilename(image: ChatImage): ChatImage {
  if (image.filename) return image;
  const ext = image.mime.includes("svg") ? "svg" : image.mime.includes("pdf") ? "pdf" : "png";
  return { ...image, filename: `diagram.${ext}` };
}
