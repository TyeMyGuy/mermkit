# CLI

## Commands

### render
Render Mermaid to SVG/PNG/PDF.

```
mermkit render --in diagram.mmd --out diagram.svg
mermkit render --stdin --format png --out out.png
mermkit render --in README.md --out-dir diagrams --format svg
```

### extract
Extract Mermaid blocks from markdown and write `.mmd` files.

```
mermkit extract --in README.md --out-dir diagrams/
```

### term
Best-effort terminal output. Uses inline images when supported.

```
mermkit term --in diagram.mmd
```

### preview
Local preview server.

```
mermkit preview --in diagram.mmd --port 7070
```

The preview UI lets you switch format/theme/engine at runtime, and upload a local file to render.

### doctor
Report engine and terminal capabilities.

```
mermkit doctor
```

### serve
JSON IPC mode for wrappers. Input is newline-delimited JSON. Output is newline-delimited JSON responses.

```
mermkit serve
```

Example request:

```
{"id":"1","action":"render","diagram":"graph TD; A-->B","options":{"format":"svg","engine":"embedded"}}
```

Example response:

```
{"id":"1","ok":true,"result":{"mime":"image/svg+xml","warnings":[],"bytes":"...base64..."}}
```

### tool-schema
Emit tool schema for agents (generic or OpenAI format).

```
mermkit tool-schema --format openai
```

## Engine selection

```
mermkit render --engine embedded
mermkit render --engine mmdc
mermkit render --engine stub
```

- `embedded` uses the `mermaid` package + `jsdom` (optional dependency)
- `mmdc` uses Mermaid CLI (`@mermaid-js/mermaid-cli`)
- `stub` generates a placeholder SVG

## Flags

- `--format svg|png|pdf|ascii|term`
- `--ascii` (force ASCII characters vs Unicode)
- `--coords` (debug grid coordinates for ASCII renderer)
- `--padding-x <n>` / `--padding-y <n>` / `--border-padding <n>` (ASCII layout tuning)
- `--format openai|generic` (tool-schema)
- `--theme light|dark|custom`
- `--scale 1.0`
- `--background transparent|#hex`
- `--engine auto|embedded|mmdc|stub|<custom>`
- `--out-manifest <file>` (render)
- `--host 127.0.0.1` (preview)
- `--port 7070` (preview)
- `--json` machine-readable output
- `--quiet` reduce warnings
