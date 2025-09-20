use std::fs;
use std::path::Path;

// Red: network3d で未使用のソース/エクスポートを削る
#[test]
fn src_has_no_alt_or_wave_effects() {
    // 不要WGSLが存在しないこと
    for p in [
        "src/alt_shader.wgsl",
        "src/wave_shader.wgsl",
        "src/shader.wgsl",
    ] {
        assert!(
            !Path::new(p).exists(),
            "{} should be removed for network3d-only build",
            p
        );
    }

    // lib.rs 内の不要API記述が無いこと（テキストベースの簡易検査）
    let lib = fs::read_to_string("src/lib.rs").expect("read src/lib.rs");
    for sym in [
        "start_wave(",
        "frame_wave(",
        "resize_wave(",
        "start_alt(",
        "frame_alt(",
        "resize_alt(",
        "pub async fn start(", // 2D用の start
        "fn compute_view_proj(",
        "STATE_ALT",
        "STATE_WAVE",
        "AltState",
        "WaveState",
        "Uniforms ",
        "make_grid()",
        "NX:",
        "NZ:",
        "SIZE_X:",
        "SIZE_Z:",
    ] {
        assert!(
            !lib.contains(sym),
            "src/lib.rs still contains removed symbol: {}",
            sym
        );
    }
}

