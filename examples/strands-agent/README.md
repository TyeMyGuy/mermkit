# Strands agent example

Tiny example integrating `mermkit` with a Strands Agent tool.

## Setup

```
pip install strands-agents mermkit
```

Make sure `mermkit` is on PATH or set `MERMKIT_BIN`:

```
export MERMKIT_BIN=/path/to/mermkit
```

## Run

```
python examples/strands-agent/agent.py
```

This runs a direct tool call (no model required) via the Python wrapper. The commented section shows how to invoke the agent with an LLM once your Strands model config is set.
