# Chat adapters

The adapters package returns platform-specific payloads for Slack, Discord, GitHub, or generic markdown. Each adapter returns:

- `payload` — JSON-ready message body for the platform
- `files` — binary attachments (use platform-specific upload APIs)
- `meta` — hints for upload behavior (e.g., GitHub upload URL)

You can also use the generic dispatcher:

```ts
import { formatForChat } from "@mermkit/adapters";
const result = formatForChat(diagram, "slack", { includeCodeBlock: true });
```

## Slack

```ts
import { formatSlackMessage } from "@mermkit/adapters";

const result = formatSlackMessage(diagram, {
  image: { bytes, mime: "image/png", filename: "diagram.png" },
  altText: "Checkout flow",
  title: "Checkout flow"
});

// result.payload => { text, blocks }
// result.files => [{ bytes, mime, filename }]
```

Slack uses `attachment://filename` in image blocks. You must upload files separately and pass them alongside the message.

## Discord

```ts
import { formatDiscordMessage } from "@mermkit/adapters";

const result = formatDiscordMessage(diagram, {
  image: { bytes, mime: "image/png", filename: "diagram.png" }
});

// result.payload => { content, embeds }
```

## GitHub (PR comment)

```ts
import { formatGitHubComment } from "@mermkit/adapters";

const result = formatGitHubComment(diagram, {
  image: { bytes, mime: "image/png", filename: "diagram.png" }
});

// result.payload.body contains markdown with an <upload_url> placeholder.
// Use the GitHub uploads API to replace it before posting.
```

## Generic markdown

```ts
import { formatGenericMessage } from "@mermkit/adapters";

const result = formatGenericMessage(diagram, { includeCodeBlock: true });
```
