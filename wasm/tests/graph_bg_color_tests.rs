use wasm_wgpu_demo::graph::{graph_clear_alpha, graph_clear_color_srgb};

#[test]
fn graph_clear_color_is_transparent_black() {
    // 背景は完全な透過黒 (#00000000) を返す
    let exp = [0.0, 0.0, 0.0];
    let got = graph_clear_color_srgb();
    let eps = 1e-6;
    for i in 0..3 { assert!((got[i]-exp[i]).abs() < eps, "idx {}: got {} exp {}", i, got[i], exp[i]); }
}

#[test]
fn graph_clear_alpha_is_zero() {
    // 透過を維持するためアルファ値は 0.0
    let got = graph_clear_alpha();
    assert!((got - 0.0).abs() < 1e-6, "expected alpha to be 0.0 but was {}", got);
}
