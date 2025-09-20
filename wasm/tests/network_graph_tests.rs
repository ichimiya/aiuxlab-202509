use wasm_wgpu_demo::graph::{generate, EdgeKind};

#[test]
fn generates_deterministic_graph() {
    let (nodes_a, edges_a) = generate(42, 64, 8);
    let (nodes_b, edges_b) = generate(42, 64, 8);
    assert_eq!(nodes_a.len(), 64);
    assert_eq!(edges_a.len(), edges_b.len());
    assert_eq!(nodes_a[0].pos, nodes_b[0].pos);
    assert_eq!(edges_a[0], edges_b[0]);
}

#[test]
fn edges_reference_valid_nodes() {
    let (nodes, edges) = generate(7, 48, 6);
    for e in &edges {
        assert!((e.a as usize) < nodes.len());
        assert!((e.b as usize) < nodes.len());
        assert_ne!(e.a, e.b, "self-loop found");
    }
}

#[test]
fn builds_central_spine() {
    let (nodes, edges) = generate(99, 80, 10);
    // 「中央スパイン」エッジが最低でも spine_segments-1 本あることを期待
    let spine_edges = edges.iter().filter(|e| e.kind == EdgeKind::Spine).count();
    assert!(spine_edges >= 9, "expected at least 9 spine edges, got {}", spine_edges);
    // スパイン上のノードはXがほぼ0付近
    let spine_nodes = nodes.iter().filter(|n| n.level == 0).count();
    assert!(spine_nodes >= 10, "expected >=10 spine nodes, got {}", spine_nodes);
}

