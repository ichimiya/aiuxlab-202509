use wasm_wgpu_demo::graph3d::{generate_shells, build_nucleus_segments};

#[test]
fn nucleus_segments_connect_all_nodes_from_center() {
    let radii = [0.6_f32, 0.8, 1.0, 1.2, 1.4];
    let probs = [0.15_f32, 0.20, 0.30, 0.20, 0.15];
    let (nodes, _edges) = generate_shells(2024, 32, &radii, &probs, 4, 1, 0.15, 0.05);
    let c = [0.0f32, 0.0, 0.0];
    let segs = build_nucleus_segments(&nodes, c);
    assert_eq!(segs.len(), nodes.len());
    for (a,b) in segs { assert_eq!(a, c); let r = (b[0]*b[0]+b[1]*b[1]+b[2]*b[2]).sqrt(); assert!(r>0.0); }
}

