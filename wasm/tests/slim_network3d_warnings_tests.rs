use std::fs;

fn prev_nonempty<'a>(lines: &'a[&'a str], mut i: usize) -> Option<&'a str> {
    while i>0 { i-=1; let t=lines[i].trim(); if !t.is_empty() { return Some(t); } }
    None
}

// Red: lib.rsの不要/未使用由来の記述を整理（テキスト検査）
#[test]
fn no_top_level_glam_matvec_import() {
    let lib = fs::read_to_string("src/lib.rs").expect("read src/lib.rs");
    // 許容: 関数内の局所useや完全修飾参照
    // 検査: ファイル全体の先頭付近（インポートセクション）に該当行が無いこと
    let head = lib.lines().take(40).collect::<Vec<_>>().join("\n");
    assert!(
        !head.contains("use glam::{Mat4, Vec3};"),
        "top-level use glam::{{Mat4, Vec3}} should be removed (function内で必要な場合のみ)"
    );
}

#[test]
fn deviceext_import_is_cfg_gated() {
    let lib = fs::read_to_string("src/lib.rs").expect("read src/lib.rs");
    let lines: Vec<&str> = lib.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        if line.trim() == "use wgpu::util::DeviceExt;" {
            let prev = prev_nonempty(&lines, i).unwrap_or("");
            assert!(prev.contains("cfg(target_arch = \"wasm32\")"), "DeviceExt import must be cfg(wasm32)-gated");
        }
    }
}

#[test]
fn wasm_only_items_are_cfg_gated() {
    let lib = fs::read_to_string("src/lib.rs").expect("read src/lib.rs");
    let lines: Vec<&str> = lib.lines().collect();
    let assert_adjacent_or_near = |needle: &str| {
        for (i, line) in lines.iter().enumerate() {
            if line.contains(needle) {
                for back in 1..=3 {
                    if i>=back {
                        let prev = lines[i-back].trim();
                        if prev.contains("cfg(target_arch = \"wasm32\")") { return; }
                    }
                }
                panic!("{} must be preceded by cfg(wasm32) within 3 lines", needle);
            }
        }
        panic!("marker not found: {}", needle);
    };
    assert_adjacent_or_near("const GRAPH_SHADER_SRC");
    assert_adjacent_or_near("struct GraphState");
    assert_adjacent_or_near("struct GraphParams");
    assert_adjacent_or_near("fn compute_view_proj_graph(");
    assert_adjacent_or_near("thread_local!");
}
