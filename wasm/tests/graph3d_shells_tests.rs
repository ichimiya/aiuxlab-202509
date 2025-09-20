use wasm_wgpu_demo::graph3d::generate_shells;

fn largest_component_ratio(n: usize, edges: &[(u32,u32)]) -> f32 {
    use std::collections::{VecDeque, HashSet};
    let mut adj = vec![Vec::<usize>::new(); n];
    for &(a,b) in edges { let a=a as usize; let b=b as usize; if a<n && b<n { adj[a].push(b); adj[b].push(a); } }
    let mut seen = vec![false;n];
    let mut best = 0usize;
    for s in 0..n {
        if seen[s] { continue; }
        let mut q = VecDeque::new(); q.push_back(s); seen[s]=true; let mut cnt=1usize;
        while let Some(v)=q.pop_front(){ for &w in &adj[v]{ if !seen[w]{ seen[w]=true; q.push_back(w); cnt+=1; } } }
        if cnt>best { best=cnt; }
    }
    best as f32 / n as f32
}

#[test]
fn shells_radius_and_connectivity() {
    let radii = [0.6, 0.8, 1.0, 1.2, 1.4];
    let probs = [0.15, 0.20, 0.30, 0.20, 0.15];
    let (nodes, edges) = generate_shells(4242, 220, &radii, &probs, 4, 1, 0.15, 0.05);

    // 各ノードの半径がいずれかのシェル半径±許容誤差内
    for n in &nodes {
        let p = n.pos; let r = (p[0]*p[0]+p[1]*p[1]+p[2]*p[2]).sqrt();
        let ok = radii.iter().any(|&rr| (r-rr).abs() <= rr*0.08 + 0.02);
        assert!(ok, "node radius {} not near shells", r);
    }

    // 連結性: 最大連結成分が80%以上
    let undirected: Vec<(u32,u32)> = edges.iter().map(|e|(e.a,e.b)).collect();
    let ratio = largest_component_ratio(nodes.len(), &undirected);
    assert!(ratio >= 0.8, "largest component ratio too small: {}", ratio);
}

