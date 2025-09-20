use wasm_wgpu_demo::graph3d::generate_cloud;

fn largest_component_ratio(n: usize, edges: &[(u32,u32)]) -> f32 {
    use std::collections::VecDeque;
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
fn cloud_points_within_radius_and_connected() {
    let (nodes, edges) = generate_cloud(20250909, 240, 1.2, 5, 0.15, 0.05);
    // 半径内チェック
    for n in &nodes {
        let p = n.pos; let r = (p[0]*p[0]+p[1]*p[1]+p[2]*p[2]).sqrt();
        assert!(r <= 1.2001, "radius exceeded: {}", r);
    }
    // 連結性: 最大成分が 0.8 以上
    let undirected: Vec<(u32,u32)> = edges.iter().map(|e|(e.a,e.b)).collect();
    let ratio = largest_component_ratio(nodes.len(), &undirected);
    assert!(ratio >= 0.8, "largest component ratio too small: {}", ratio);
    // 分布に偏りが少なく、中心/外側双方が含まれる（ゆるいチェック）
    let mut inner=0usize; let mut outer=0usize;
    for n in &nodes { let p=n.pos; let r=(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]).sqrt(); if r<0.5 { inner+=1; } if r>0.9 { outer+=1; } }
    assert!(inner>10 && outer>5, "inner {}, outer {}", inner, outer);
}
