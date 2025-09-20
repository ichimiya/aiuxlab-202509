use wasm_wgpu_demo::graph::{palette_color, Palette};

fn srgb_to_linear(c: f32) -> f32 {
    if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) }
}

#[test]
fn palette_cyan_matches_7be7f8_in_linear_space() {
    // 期待: Cyan は sRGB #7be7f8（R=123,G=231,B=248）を線形化した色
    let sr = 123.0/255.0; let sg = 231.0/255.0; let sb = 248.0/255.0;
    let exp = [srgb_to_linear(sr), srgb_to_linear(sg), srgb_to_linear(sb), 1.0];
    let got = palette_color(Palette::Cyan);
    let eps = 1e-4;
    for i in 0..4 { assert!((got[i]-exp[i]).abs() < eps, "idx {}: got {} exp {}", i, got[i], exp[i]); }
}

