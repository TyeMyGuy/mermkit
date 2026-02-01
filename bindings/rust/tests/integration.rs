use std::env;

#[test]
fn render_stub() {
    if env::var("MERMKIT_BIN").is_err() {
        return;
    }
    let result = mermkit::render("graph TD; A-->B", "svg", None, Some("stub")).unwrap();
    assert!(!result.bytes.is_empty());
}
