use wasm_wgpu_demo::shader_math::drift_position;

fn len3(v: [f32;3]) -> f32 { (v[0]*v[0]+v[1]*v[1]+v[2]*v[2]).sqrt() }
fn sub3(a: [f32;3], b: [f32;3]) -> [f32;3] { [a[0]-b[0], a[1]-b[1], a[2]-b[2]] }

#[test]
fn drift_is_bounded_and_time_dependent() {
    let p = [0.3, -0.6, 0.9];
    let s = 1.0; // speed
    let p0 = drift_position(p, 0.0, s);
    let p1 = drift_position(p, 1.0, s);
    let d = len3(sub3(p1, p0));
    // ある程度は動く（> 0.0）かつ振幅に上限がある（< 0.35）
    assert!(d > 1e-5, "no motion");
    assert!(d < 0.35, "motion too large: {}", d);
}

