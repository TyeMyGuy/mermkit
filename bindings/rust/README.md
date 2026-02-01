# mermkit (Rust)

Minimal wrapper around the `mermkit` CLI.

## Install

```
cargo add mermkit
```

## Usage

```rust
let result = mermkit::render("graph TD; A-->B", "svg", None, None)?;
```

## Serve mode

```rust
let mut client = mermkit::Client::new()?;
let result = client.render("graph TD; A-->B", "svg", None, None)?;
```

## Requirements
- `mermkit` CLI available on PATH, or set `MERMKIT_BIN`:

```
export MERMKIT_BIN=/path/to/mermkit
```
