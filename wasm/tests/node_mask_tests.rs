use wasm_wgpu_demo::shader_math::node_intensity;

#[test]
fn node_intensity_drops_towards_border() {
    let center = node_intensity(0.0, 0.0);
    let mid = node_intensity(0.8, 0.0);
    let edge = node_intensity(1.05, 0.0);
    assert!(center > mid, "center should be brighter than mid");
    assert!(mid > edge, "mid should be brighter than outside edge");
    assert!(edge < 0.05, "outside intensity should be near zero: {}", edge);
}

