use wasm_wgpu_demo::graph::{palette_color, Palette};

fn approx(a: f32, b: f32, eps: f32) -> bool { (a-b).abs() <= eps }

#[test]
fn palette_neon_values() {
    let mag = palette_color(Palette::Magenta);
    assert!(approx(mag[0], 1.0, 1e-6) && approx(mag[1], 0.0, 1e-6) && approx(mag[2], 1.0, 1e-6));
    // Cyan は #7BE7F8（sRGB）→ 線形へ変換された値
    let srgb_to_linear = |c: f32| if c <= 0.04045 { c/12.92 } else { ((c+0.055)/1.055).powf(2.4) };
    let exp = [srgb_to_linear(123.0/255.0), srgb_to_linear(231.0/255.0), srgb_to_linear(248.0/255.0)];
    let cyan = palette_color(Palette::Cyan);
    assert!(approx(cyan[0], exp[0], 1e-4) && approx(cyan[1], exp[1], 1e-4) && approx(cyan[2], exp[2], 1e-4));
}
