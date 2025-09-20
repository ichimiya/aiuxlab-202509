use wasm_wgpu_demo::graph3d::{generate_sphere};

#[test]
fn nodes_on_unit_sphere() {
    let (nodes, edges) = generate_sphere(123, 64, 4, 0.1);
    for n in &nodes {
        let p = n.pos; let r = (p[0]*p[0]+p[1]*p[1]+p[2]*p[2]).sqrt();
        assert!((r-1.0).abs() < 1e-3, "radius near 1, got {}", r);
    }
    for e in &edges {
        assert!((e.a as usize) < nodes.len());
        assert!((e.b as usize) < nodes.len());
        assert_ne!(e.a, e.b);
    }
}

