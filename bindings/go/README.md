# mermkit (Go)

Minimal wrapper around the `mermkit` CLI.

## Install

```
go get github.com/mermkit/mermkit/bindings/go
```

## Usage

```go
result, err := mermkit.Render("graph TD; A-->B", "svg", "", "")
```

## Serve mode

```go
client, err := mermkit.NewClient()
if err != nil {
    // handle error
}
defer client.Close()

result, err := client.Render("graph TD; A-->B", "svg", "", "")
```

## Requirements
- `mermkit` CLI available on PATH, or set `MERMKIT_BIN`:

```
export MERMKIT_BIN=/path/to/mermkit
```
