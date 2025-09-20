use wasm_wgpu_demo::shader_math::link_strength;

#[test]
fn link_strength_window_behaves_monotonic() {
    let on = 0.20;  // ここから表示し始め
    let off = 0.35; // ここでほぼ消える
    let near = 0.10; // 近距離→強い
    let mid  = 0.27; // 中間→中程度
    let far  = 0.50; // 遠距離→弱い
    let s_near = link_strength(near, on, off);
    let s_mid  = link_strength(mid,  on, off);
    let s_far  = link_strength(far,  on, off);
    assert!(s_near > s_mid && s_mid > s_far, "{} !> {} !> {}", s_near, s_mid, s_far);
    assert!(s_near <= 1.0 + 1e-6 && s_far >= -1e-6);
}

