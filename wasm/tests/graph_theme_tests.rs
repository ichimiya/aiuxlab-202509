use wasm_wgpu_demo::graph::{palette_color, Palette};
use wasm_wgpu_demo::graph3d::EdgeKind3;
use wasm_wgpu_demo::graph::{theme_edge_color, theme_node_color};

#[test]
fn edge_colors_are_unified_cyan() {
    // 線の色は種別に関係なくCyanで統一
    let cyan = palette_color(Palette::Cyan);
    assert_eq!(theme_edge_color(EdgeKind3::Mesh), cyan);
    assert_eq!(theme_edge_color(EdgeKind3::Extra), cyan);
}

#[test]
fn node_colors_are_magenta_for_hub_and_cyan_for_normal() {
    // ノードの色: ハブ→マゼンタ、通常→シアン
    let magenta = palette_color(Palette::Magenta);
    let cyan = palette_color(Palette::Cyan);
    assert_eq!(theme_node_color(0), magenta); // ハブ
    assert_eq!(theme_node_color(1), cyan);    // 通常
}
