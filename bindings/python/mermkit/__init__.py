import base64
import json
import os
import subprocess
from dataclasses import dataclass
from typing import Optional, Iterable, Any, Dict, IO


@dataclass
class RenderResult:
    bytes: bytes
    mime: str
    warnings: list[str]


class MermkitClient:
    def __init__(self) -> None:
        self._proc: Optional[subprocess.Popen[bytes]] = None
        self._stdout: Optional[IO[bytes]] = None
        self._stdin: Optional[IO[bytes]] = None

    def start(self) -> None:
        if self._proc is not None:
            return
        binary = os.environ.get("MERMKIT_BIN", "mermkit")
        self._proc = subprocess.Popen(
            [binary, "serve"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self._stdin = self._proc.stdin
        self._stdout = self._proc.stdout

    def close(self) -> None:
        if self._proc is None:
            return
        try:
            self._proc.terminate()
        finally:
            self._proc = None
            self._stdin = None
            self._stdout = None

    def _send(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self.start()
        assert self._stdin is not None and self._stdout is not None
        line = (json.dumps(payload) + "\n").encode("utf-8")
        self._stdin.write(line)
        self._stdin.flush()
        response_line = self._stdout.readline()
        if not response_line:
            raise RuntimeError("mermkit serve closed the pipe")
        return json.loads(response_line.decode("utf-8"))

    def render(self, source: str, format: str = "svg", theme: Optional[str] = None, engine: Optional[str] = None) -> RenderResult:
        request = {
            "action": "render",
            "diagram": source,
            "options": {"format": format, "theme": theme, "engine": engine},
        }
        response = self._send(request)
        if not response.get("ok"):
            raise RuntimeError(response.get("error") or "mermkit render failed")
        result = response.get("result", {})
        data = result.get("bytes")
        if data is None:
            raise RuntimeError("mermkit render returned no bytes")
        return RenderResult(
            bytes=base64.b64decode(data),
            mime=result.get("mime", "application/octet-stream"),
            warnings=result.get("warnings", []),
        )


def render(source: str, format: str = "svg", theme: Optional[str] = None, engine: Optional[str] = None) -> RenderResult:
    binary = os.environ.get("MERMKIT_BIN", "mermkit")
    args = [binary, "render", "--stdin", "--format", format, "--json"]
    if theme:
        args += ["--theme", theme]
    if engine:
        args += ["--engine", engine]

    proc = subprocess.run(
        args,
        input=source.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8").strip() or "mermkit render failed")

    payload = json.loads(proc.stdout.decode("utf-8"))
    data = payload.get("bytes")
    if data is None:
        raise RuntimeError("mermkit render returned no bytes")

    return RenderResult(
        bytes=base64.b64decode(data),
        mime=payload.get("mime", "application/octet-stream"),
        warnings=payload.get("warnings", []),
    )


def render_many(diagrams: Iterable[str], format: str = "svg") -> list[RenderResult]:
    client = MermkitClient()
    results: list[RenderResult] = []
    try:
        for diagram in diagrams:
            results.append(client.render(diagram, format=format))
    finally:
        client.close()
    return results
