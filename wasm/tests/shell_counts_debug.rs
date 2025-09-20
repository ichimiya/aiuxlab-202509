use wasm_wgpu_demo::graph3d::generate_shells;

#[test]
fn print_shell_counts() {
    let radii = [0.6_f32, 0.8, 1.0, 1.2, 1.4];
    let probs = [0.15_f32, 0.20, 0.30, 0.20, 0.15];
    let (nodes, _edges) = generate_shells(1337, 240, &radii, &probs, 4, 1, 0.15, 0.05);
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
    println!("shell counts: {:?}", counts);
}

