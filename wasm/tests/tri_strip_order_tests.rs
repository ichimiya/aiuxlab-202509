use wasm_wgpu_demo::graph::quad_corners;

#[test]
fn quad_corners_order_for_strip() {
    let c = quad_corners();
    assert_eq!(c[0], (-0.5, -0.5));
    assert_eq!(c[1], ( 0.5, -0.5));
    assert_eq!(c[2], (-0.5,  0.5));
    assert_eq!(c[3], ( 0.5,  0.5));
}

