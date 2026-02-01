import atexit
from strands import Agent, tool
from mermkit import MermkitClient


_client = MermkitClient()
_client.start()
atexit.register(_client.close)


@tool
def render_mermaid(diagram: str, format: str = "svg") -> dict:
    """Render Mermaid to SVG/PNG using the mermkit Python wrapper."""
    result = _client.render(diagram, format=format, engine="stub")
    return {"mime": result.mime, "bytes": result.bytes, "warnings": result.warnings}


if __name__ == "__main__":
    agent = Agent(tools=[render_mermaid])

    # Direct tool call (no LLM required)
    result = agent.tool.render_mermaid("graph TD; A-->B", format="svg")
    print("tool result:", result)

    # LLM-driven example (requires Strands model configuration)
    # response = agent("Render this Mermaid diagram: graph TD; A-->B")
    # print(response)
