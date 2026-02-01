# Bindings

The bindings use the `mermkit` CLI as the canonical renderer. This keeps behavior consistent across languages and avoids re-implementing Mermaid rendering logic.

## Python

```python
from mermkit import render

result = render("graph TD; A-->B", format="svg")
```

Install:

```
pip install mermkit
```

### Serve mode

```python
from mermkit import MermkitClient

client = MermkitClient()
client.start()
result = client.render("graph TD; A-->B")
client.close()
```

## Go

```go
result, err := mermkit.Render("graph TD; A-->B", "svg", "", "")
```

Install:

```
go get github.com/mermkit/mermkit/bindings/go
```

### Serve mode

```go
client, err := mermkit.NewClient()
if err != nil {
    // handle error
}
defer client.Close()

result, err := client.Render("graph TD; A-->B", "svg", "", "")
```

## Rust

```rust
let result = mermkit::render("graph TD; A-->B", "svg", None, None)?;
```

Install:

```
cargo add mermkit
```

### Serve mode

```rust
let mut client = mermkit::Client::new()?;
let result = client.render("graph TD; A-->B", "svg", None, None)?;
```

## Notes
- The CLI must be on PATH, or set `MERMKIT_BIN` to the CLI path.
- `--json` output is used as the IPC protocol between wrappers and the CLI.
- For long-running processes, use `mermkit serve` to avoid repeated process startup.
