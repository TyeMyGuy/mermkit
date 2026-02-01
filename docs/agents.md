# AI agent usage

This repo is designed to be agent-friendly: deterministic rendering, JSON IPC, batch render, and tool schemas.

## Recommended flow

1) Use the Python wrapper (`MermkitClient`) when you’re in Python; it keeps the CLI usage internal.
2) Prefer `renderBatch` when multiple diagrams appear in a single prompt.
3) Cache results by `sha256(normalizedMermaid + options)`.

## Python wrapper (preferred in Python)

```python
from mermkit import MermkitClient

client = MermkitClient()
client.start()
result = client.render("graph TD; A-->B", format="svg", engine="stub")
client.close()
```

## Agent SDK snippets

These examples use the Python wrapper in Python SDKs. Non‑Python SDKs can call the CLI or `mermkit serve`.

### OpenAI (Python)

```python
from mermkit import MermkitClient
from openai import OpenAI

client = MermkitClient()
client.start()

def mermkit_render(diagram: str, format: str = "svg"):
    result = client.render(diagram, format=format, engine="stub")
    return {"mime": result.mime, "bytes": result.bytes, "warnings": result.warnings}

tools = [{
    "type": "function",
    "function": {
        "name": "mermkit_render",
        "description": "Render Mermaid to SVG/PNG/PDF",
        "parameters": {
            "type": "object",
            "properties": {
                "diagram": {"type": "string"},
                "format": {"type": "string", "enum": ["svg", "png", "pdf"]}
            },
            "required": ["diagram"]
        }
    }
}]

client = OpenAI()
# pass tools=tools and route tool calls to mermkit_render
```

### LangChain (Python)

```python
from langchain.tools import tool
from mermkit import MermkitClient

client = MermkitClient()
client.start()

@tool
def mermkit_render(diagram: str, format: str = "svg") -> dict:
    result = client.render(diagram, format=format, engine="stub")
    return {"mime": result.mime, "bytes": result.bytes, "warnings": result.warnings}
```

### LlamaIndex (Python)

```python
from llama_index.core.tools import FunctionTool
from mermkit import MermkitClient

client = MermkitClient()
client.start()

def mermkit_render(diagram: str, format: str = "svg") -> dict:
    result = client.render(diagram, format=format, engine="stub")
    return {"mime": result.mime, "bytes": result.bytes, "warnings": result.warnings}

tool = FunctionTool.from_defaults(fn=mermkit_render, name="mermkit_render")
```

### CrewAI (Python)

```python
from crewai_tools import tool
from mermkit import MermkitClient

client = MermkitClient()
client.start()

@tool("mermkit_render")
def mermkit_render(diagram: str, format: str = "svg") -> dict:
    result = client.render(diagram, format=format, engine="stub")
    return {"mime": result.mime, "bytes": result.bytes, "warnings": result.warnings}
```

### Strands (Python)

```python
from strands import tool
from mermkit import MermkitClient

client = MermkitClient()
client.start()

@tool
def mermkit_render(diagram: str, format: str = "svg") -> dict:
    result = client.render(diagram, format=format, engine="stub")
    return {"mime": result.mime, "bytes": result.bytes, "warnings": result.warnings}
```

### Vercel AI SDK (TypeScript)

```ts
import { tool } from "ai";
import { spawnSync } from "node:child_process";

export const mermkitRender = tool({
  name: "mermkit_render",
  description: "Render Mermaid to SVG/PNG/PDF.",
  parameters: {
    type: "object",
    properties: {
      diagram: { type: "string" },
      format: { type: "string", enum: ["svg", "png", "pdf"] }
    },
    required: ["diagram"]
  },
  execute: async ({ diagram, format = "svg" }) => {
    const res = spawnSync("mermkit", ["render", "--stdin", "--format", format, "--engine", "stub", "--json"], {
      input: diagram
    });
    return JSON.parse(res.stdout.toString());
  }
});
```

## CLI/serve fallback (non‑Python SDKs)

If you’re not in Python, use the CLI or `mermkit serve` JSON IPC. This keeps behavior consistent across languages without re‑implementing render logic in each SDK.

## Determinism

- Pin render engines and dependencies.
- Keep `theme`, `scale`, and `background` explicit.
- Use `--out-manifest` to record hashes + outputs.

## Caching

Recommended cache key:

```
sha256(normalize(mermaid) + JSON.stringify({format, theme, scale, background, engine}))
```

## Safety defaults

- Remote includes disabled by default.
- Prefer `engine=embedded` or `engine=auto` with explicit fallbacks.
