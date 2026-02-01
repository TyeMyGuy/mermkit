package mermkit

import (
  "bufio"
  "bytes"
  "encoding/base64"
  "encoding/json"
  "errors"
  "os"
  "os/exec"
)

type RenderResult struct {
  Bytes    []byte
  Mime     string
  Warnings []string
}

type renderPayload struct {
  Bytes    string   `json:"bytes"`
  Mime     string   `json:"mime"`
  Warnings []string `json:"warnings"`
}

type serveRequest struct {
  Action  string                 `json:"action"`
  Diagram string                 `json:"diagram,omitempty"`
  Options map[string]interface{} `json:"options,omitempty"`
}

type serveResponse struct {
  OK     bool           `json:"ok"`
  Result renderPayload  `json:"result"`
  Error  string         `json:"error"`
}

type Client struct {
  cmd    *exec.Cmd
  stdin  *bufio.Writer
  stdout *bufio.Reader
}

func NewClient() (*Client, error) {
  cmd := exec.Command(getBinary(), "serve")
  stdin, err := cmd.StdinPipe()
  if err != nil {
    return nil, err
  }
  stdout, err := cmd.StdoutPipe()
  if err != nil {
    return nil, err
  }
  if err := cmd.Start(); err != nil {
    return nil, err
  }
  return &Client{
    cmd:    cmd,
    stdin:  bufio.NewWriter(stdin),
    stdout: bufio.NewReader(stdout),
  }, nil
}

func (c *Client) Close() error {
  if c.cmd == nil || c.cmd.Process == nil {
    return nil
  }
  return c.cmd.Process.Kill()
}

func (c *Client) Render(source string, format string, theme string, engine string) (*RenderResult, error) {
  options := map[string]interface{}{
    "format": format,
  }
  if theme != "" {
    options["theme"] = theme
  }
  if engine != "" {
    options["engine"] = engine
  }
  req := serveRequest{
    Action:  "render",
    Diagram: source,
    Options: options,
  }
  payload, err := json.Marshal(req)
  if err != nil {
    return nil, err
  }
  if _, err := c.stdin.Write(append(payload, '\n')); err != nil {
    return nil, err
  }
  if err := c.stdin.Flush(); err != nil {
    return nil, err
  }
  line, err := c.stdout.ReadBytes('\n')
  if err != nil {
    return nil, err
  }
  var resp serveResponse
  if err := json.Unmarshal(line, &resp); err != nil {
    return nil, err
  }
  if !resp.OK {
    if resp.Error != "" {
      return nil, errors.New(resp.Error)
    }
    return nil, errors.New("mermkit render failed")
  }

  if resp.Result.Bytes == "" {
    return nil, errors.New("mermkit render returned no bytes")
  }
  data, err := base64.StdEncoding.DecodeString(resp.Result.Bytes)
  if err != nil {
    return nil, err
  }
  return &RenderResult{
    Bytes:    data,
    Mime:     resp.Result.Mime,
    Warnings: resp.Result.Warnings,
  }, nil
}

func Render(source string, format string, theme string, engine string) (*RenderResult, error) {
  args := []string{"render", "--stdin", "--format", format, "--json"}
  if theme != "" {
    args = append(args, "--theme", theme)
  }
  if engine != "" {
    args = append(args, "--engine", engine)
  }

  cmd := exec.Command(getBinary(), args...)
  cmd.Stdin = bytes.NewBufferString(source)
  var out bytes.Buffer
  var errOut bytes.Buffer
  cmd.Stdout = &out
  cmd.Stderr = &errOut

  if err := cmd.Run(); err != nil {
    if errOut.Len() > 0 {
      return nil, errors.New(errOut.String())
    }
    return nil, err
  }

  var payload renderPayload
  if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
    return nil, err
  }

  if payload.Bytes == "" {
    return nil, errors.New("mermkit render returned no bytes")
  }

  data, err := base64.StdEncoding.DecodeString(payload.Bytes)
  if err != nil {
    return nil, err
  }

  return &RenderResult{
    Bytes:    data,
    Mime:     payload.Mime,
    Warnings: payload.Warnings,
  }, nil
}

func getBinary() string {
  if bin := os.Getenv("MERMKIT_BIN"); bin != "" {
    return bin
  }
  return "mermkit"
}
