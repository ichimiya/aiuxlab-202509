use wasm_wgpu_demo::graph3d::generate_shells;

#[test]
fn inner_heavy_profile_increases_inner_counts() {
    let radii = [0.6_f32, 0.8, 1.0, 1.2, 1.4];
    // inner-heavy probabilities (descending)
    let probs = [0.34_f32, 0.26, 0.20, 0.12, 0.08];
    let (nodes, _edges) = generate_shells(20250909, 240, &radii, &probs, 4, 1, 0.15, 0.05);
    let mut counts = [0usize; 5];
    for n in &nodes {
        let r = (n.pos[0]*n.pos[0] + n.pos[1]*n.pos[1] + n.pos[2]*n.pos[2]).sqrt();
        let mut best = 0usize; let mut bd = f32::INFINITY;
        for (i,&rr) in radii.iter().enumerate() {
            let d = (r - rr).abs();
            if d < bd { bd = d; best = i; }
        }
        counts[best]+=1;
    }
    // inner two shells should have more than outer two shells in total
    let inner = counts[0] + counts[1];
    let outer = counts[3] + counts[4];
    assert!(inner > outer, "inner {:?} outer {:?}", counts, counts);
}

