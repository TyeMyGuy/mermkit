use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::Deserialize;
use std::env;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

#[derive(Debug)]
pub struct RenderResult {
    pub bytes: Vec<u8>,
    pub mime: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct RenderPayload {
    bytes: Option<String>,
    mime: Option<String>,
    warnings: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct ServeResponse {
    ok: bool,
    result: Option<RenderPayload>,
    error: Option<String>,
}

pub struct Client {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl Client {
    pub fn new() -> Result<Self, String> {
        let mut child = Command::new(get_binary())
            .arg("serve")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        let stdin = child.stdin.take().ok_or_else(|| "failed to open stdin".to_string())?;
        let stdout = child.stdout.take().ok_or_else(|| "failed to open stdout".to_string())?;
        Ok(Self {
            child,
            stdin,
            stdout: BufReader::new(stdout),
        })
    }

    pub fn render(
        &mut self,
        source: &str,
        format: &str,
        theme: Option<&str>,
        engine: Option<&str>,
    ) -> Result<RenderResult, String> {
        let mut options = serde_json::Map::new();
        options.insert("format".to_string(), serde_json::Value::String(format.to_string()));
        if let Some(t) = theme {
            options.insert("theme".to_string(), serde_json::Value::String(t.to_string()));
        }
        if let Some(e) = engine {
            options.insert("engine".to_string(), serde_json::Value::String(e.to_string()));
        }

        let request = serde_json::json!({
            "action": "render",
            "diagram": source,
            "options": options
        });

        let line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
        self.stdin.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
        self.stdin.write_all(b"\n").map_err(|e| e.to_string())?;
        self.stdin.flush().map_err(|e| e.to_string())?;

        let mut response_line = String::new();
        self.stdout.read_line(&mut response_line).map_err(|e| e.to_string())?;
        let resp: ServeResponse = serde_json::from_str(&response_line).map_err(|e| e.to_string())?;
        if !resp.ok {
            return Err(resp.error.unwrap_or_else(|| "mermkit render failed".to_string()));
        }

        let payload = resp.result.ok_or_else(|| "missing result".to_string())?;
        let bytes_b64 = payload.bytes.ok_or_else(|| "mermkit render returned no bytes".to_string())?;
        let bytes = STANDARD.decode(bytes_b64).map_err(|e| e.to_string())?;

        Ok(RenderResult {
            bytes,
            mime: payload.mime.unwrap_or_else(|| "application/octet-stream".to_string()),
            warnings: payload.warnings.unwrap_or_default(),
        })
    }
}

pub fn render(source: &str, format: &str, theme: Option<&str>, engine: Option<&str>) -> Result<RenderResult, String> {
    let mut args = vec!["render", "--stdin", "--format", format, "--json"];
    if let Some(t) = theme {
        args.push("--theme");
        args.push(t);
    }
    if let Some(e) = engine {
        args.push("--engine");
        args.push(e);
    }

    let mut child = Command::new(get_binary())
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(stdin) = child.stdin.as_mut() {
        use std::io::Write;
        stdin.write_all(source.as_bytes()).map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.trim().to_string());
    }

    let payload: RenderPayload = serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    let bytes_b64 = payload.bytes.ok_or_else(|| "mermkit render returned no bytes".to_string())?;
    let bytes = STANDARD.decode(bytes_b64).map_err(|e| e.to_string())?;

    Ok(RenderResult {
        bytes,
        mime: payload.mime.unwrap_or_else(|| "application/octet-stream".to_string()),
        warnings: payload.warnings.unwrap_or_default(),
    })
}

fn get_binary() -> String {
    env::var("MERMKIT_BIN").unwrap_or_else(|_| "mermkit".to_string())
}
