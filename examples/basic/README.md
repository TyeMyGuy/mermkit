# Basic example

Render a Mermaid file to SVG:

```
mermkit render --in diagram.mmd --out diagram.svg
```

Render a fenced block from markdown:

```
mermkit render --in diagram.md --out diagram.svg
```

Render all Mermaid blocks from markdown:

```
mermkit render --in diagram.md --out-dir out --format svg
```

Terminal rendering (best effort):

```
mermkit term --in diagram.mmd
```

Preview server:

```
mermkit preview --in diagram.mmd --port 7070
```

Sequence diagram example:

```
mermkit render --in sequence.mmd --out sequence.svg
mermkit term --in sequence.mmd
```
