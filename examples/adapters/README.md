# Adapters example

This folder shows how to build platform payloads for Slack, Discord, and GitHub.

```ts
import { formatSlackMessage, formatDiscordMessage, formatGitHubComment } from "@mermkit/adapters";

const diagram = { id: "d1", source: "graph TD; A-->B" };
const image = { bytes: new Uint8Array(), mime: "image/png", filename: "diagram.png" };

const slack = formatSlackMessage(diagram, { image, altText: "Example" });
const discord = formatDiscordMessage(diagram, { image });
const github = formatGitHubComment(diagram, { image });

console.log(slack.payload, slack.files);
console.log(discord.payload, discord.files);
console.log(github.payload, github.files, github.meta);
```

For Slack/Discord, upload files first and reference them as `attachment://filename`.
For GitHub, use the uploads API and replace the `<upload_url>` placeholder.
