use wasm_wgpu_demo::shader_math::radial_strength;

#[test]
fn radial_strength_monotonic_and_clamped() {
    let r0 = 0.6;  // inner shell近辺
    let r1 = 1.4;  // outer shell近辺
    let min = 0.35; // 最小強度
    let near = 0.7;
    let mid  = 1.05;
    let far  = 1.35;
    let s_near = radial_strength(near, r0, r1, min);
    let s_mid  = radial_strength(mid,  r0, r1, min);
    let s_far  = radial_strength(far,  r0, r1, min);
    assert!(s_near > s_mid && s_mid > s_far, "{} !> {} !> {}", s_near, s_mid, s_far);
    for s in [s_near, s_mid, s_far] { assert!(s >= min - 1e-6 && s <= 1.0 + 1e-6); }
}

