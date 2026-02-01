package mermkit

import "testing"

func TestRenderStub(t *testing.T) {
  if getBinary() == "mermkit" {
    t.Skip("MERMKIT_BIN not set")
  }
  result, err := Render("graph TD; A-->B", "svg", "", "stub")
  if err != nil {
    t.Fatalf("render failed: %v", err)
  }
  if len(result.Bytes) == 0 {
    t.Fatal("empty render result")
  }
}
