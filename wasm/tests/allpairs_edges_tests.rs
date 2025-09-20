use wasm_wgpu_demo::graph3d::{generate_shells, build_all_pairs_edges};

#[test]
fn all_pairs_edges_have_expected_count_and_no_self() {
    let radii = [0.6, 0.8, 1.0, 1.2, 1.4];
    let probs = [0.15, 0.20, 0.30, 0.20, 0.15];
    let (nodes, _e) = generate_shells(4242, 50, &radii, &probs, 4, 1, 0.15, 0.05);
    let edges = build_all_pairs_edges(&nodes);
    let n = nodes.len() as u32;
    let expected = (n * (n - 1)) / 2;
    assert_eq!(edges.len() as u32, expected);
    // no self-loops and undirected unique
    for e in &edges { assert_ne!(e.a, e.b); assert!(e.a < n && e.b < n); }
    // sorted unique pairs (a<b)
    let mut v: Vec<(u32,u32)> = edges.iter().map(|e|(e.a.min(e.b), e.a.max(e.b))).collect();
    let mut w = v.clone(); w.sort(); w.dedup();
    assert_eq!(v.len(), w.len());
}

