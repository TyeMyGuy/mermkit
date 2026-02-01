# mermkit (Python)

Minimal wrapper around the `mermkit` CLI.

## Install

```
pip install mermkit
```

## Usage

```python
from mermkit import render

svg = render("graph TD; A-->B", format="svg")
```

## Serve mode
For repeated renders, use the JSON IPC server:

```python
from mermkit import MermkitClient

client = MermkitClient()
client.start()
result = client.render("graph TD; A-->B")
client.close()
```

## Requirements
- `mermkit` CLI available on PATH, or set `MERMKIT_BIN`:

```
export MERMKIT_BIN=/path/to/mermkit
```
