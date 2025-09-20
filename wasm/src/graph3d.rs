use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Node3 {
    pub id: u32,
    pub pos: [f32; 3], // object space (unit sphere)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EdgeKind3 { Mesh, Extra }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Edge3 { pub a: u32, pub b: u32, pub kind: EdgeKind3 }

// Simple RNG (LCG) for determinism.
#[derive(Clone)]
struct Lcg(u64);
impl Lcg {
    fn new(seed: u64) -> Self { Self(seed | 1) }
    fn next_u32(&mut self) -> u32 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.0 >> 32) as u32
    }
    fn next_f32(&mut self) -> f32 { (self.next_u32() as f32) / (u32::MAX as f32) }
}

fn fib_sphere_points(n: usize) -> Vec<[f32; 3]> {
    // Even-ish distribution on unit sphere using Fibonacci spiral
    // https://stackoverflow.com/a/26127012
    let n = n.max(4);
    let golden = (1.0 + 5.0_f32.sqrt()) * 0.5;
    let ga = 2.0 * std::f32::consts::PI / (golden * golden);
    (0..n)
        .map(|i| {
            let t = (i as f32 + 0.5) / (n as f32);
            let y = 1.0 - 2.0 * t;           // [-1,1]
            let r = (1.0 - y * y).max(0.0).sqrt();
            let phi = ga * i as f32;
            let x = r * phi.cos();
            let z = r * phi.sin();
            [x, y, z]
        })
        .collect()
}

pub fn generate_sphere(seed: u64, num_nodes: usize, neighbors: usize, extra_ratio: f32)
    -> (Vec<Node3>, Vec<Edge3>)
{
    let centers = fib_sphere_points(num_nodes);
    let nodes: Vec<Node3> = centers
        .into_iter()
        .enumerate()
        .map(|(i,p)| Node3 { id: i as u32, pos: p })
        .collect();

    // Build neighbor edges by k-NN (brute-force)
    let k = neighbors.max(1).min(12);
    let mut set: HashSet<(u32,u32)> = HashSet::new();
    for i in 0..nodes.len() {
        // find k nearest distinct j
        let mut d: Vec<(f32, usize)> = (0..nodes.len()).filter(|&j| j!=i)
            .map(|j| { let a = nodes[i].pos; let b = nodes[j].pos; let dx=a[0]-b[0]; let dy=a[1]-b[1]; let dz=a[2]-b[2]; ((dx*dx+dy*dy+dz*dz), j) }).collect();
        d.sort_by(|a,b| a.0.partial_cmp(&b.0).unwrap());
        for m in 0..k { let j = d[m].1 as u32; let a=i as u32; let b=j; let key=(a.min(b), a.max(b)); set.insert(key); }
    }

    // extra cross edges
    let mut rng = Lcg::new(seed ^ 0xBEEF_BABE);
    let extras = ((nodes.len() as f32) * extra_ratio).round() as usize;
    for _ in 0..extras {
        let a = rng.next_u32() as usize % nodes.len();
        let mut b = rng.next_u32() as usize % nodes.len();
        if a==b { b = (b+1)%nodes.len(); }
        let (a,b) = (a.min(b) as u32, a.max(b) as u32);
        set.insert((a,b));
    }

    let mut edges: Vec<Edge3> = Vec::with_capacity(set.len());
    for (a,b) in set.into_iter() { edges.push(Edge3 { a, b, kind: EdgeKind3::Mesh }); }
    (nodes, edges)
}

pub fn generate_cloud(
    seed: u64,
    num_nodes: usize,
    radius: f32,
    neighbors: usize,
    extra_ratio: f32,
    hub_ratio: f32,
) -> (Vec<Node3>, Vec<Edge3>) {
    let n = num_nodes.max(4);
    let r = radius.max(0.1);
    let mut rng = Lcg::new(seed);
    let mut nodes: Vec<Node3> = Vec::with_capacity(n);
    // 一様球内サンプル: 方向は一様、半径は cbrt(u)
    for i in 0..n {
        let u1 = rng.next_f32();
        let u2 = rng.next_f32();
        let u3 = rng.next_f32();
        let phi = 2.0*std::f32::consts::PI * u1;
        let cos_th = 2.0*u2 - 1.0;
        let sin_th = (1.0 - cos_th*cos_th).max(0.0).sqrt();
        let rr = r * u3.cbrt();
        let x = rr * (phi.cos() * sin_th);
        let y = rr * (cos_th);
        let z = rr * (phi.sin() * sin_th);
        nodes.push(Node3 { id: i as u32, pos: [x,y,z] });
    }

    // k近傍 + ハブ増線 + ランダム長距離
    let k = neighbors.max(1).min(12);
    use std::collections::HashSet;
    let mut set: HashSet<(u32,u32)> = HashSet::new();
    // k-NN 全体
    for i in 0..n {
        let mut d: Vec<(f32, usize)> = (0..n).filter(|&j| j!=i)
            .map(|j| { let a=nodes[i].pos; let b=nodes[j].pos; let dx=a[0]-b[0]; let dy=a[1]-b[1]; let dz=a[2]-b[2]; (dx*dx+dy*dy+dz*dz, j) }).collect();
        d.sort_by(|a,b| a.0.partial_cmp(&b.0).unwrap());
        for m in 0..k.min(d.len()) { let j=d[m].1 as u32; let a=i as u32; let b=j; let key=(a.min(b), a.max(b)); set.insert(key); }
    }

    // ハブ: 近傍を追加
    let hubs = ((n as f32)*hub_ratio).round().max(1.0) as usize;
    for _ in 0..hubs { let i=(rng.next_u32() as usize)%n; let mut d: Vec<(f32, usize)>=(0..n).filter(|&j| j!=i)
            .map(|j| { let a=nodes[i].pos; let b=nodes[j].pos; let dx=a[0]-b[0]; let dy=a[1]-b[1]; let dz=a[2]-b[2]; (dx*dx+dy*dy+dz*dz, j) }).collect();
        d.sort_by(|a,b| a.0.partial_cmp(&b.0).unwrap());
        for m in 0..(k+4).min(d.len()) { let j=d[m].1 as u32; let a=i as u32; let b=j; let key=(a.min(b), a.max(b)); set.insert(key); }
    }

    // ランダム長距離: Extra として区別
    let extra = ((n as f32)*extra_ratio).round() as usize;
    let mut extra_edges: HashSet<(u32,u32)> = HashSet::new();
    for _ in 0..extra { let a=(rng.next_u32() as usize)%n; let mut b=(rng.next_u32() as usize)%n; if a==b{b=(b+1)%n;} let (a,b)=(a.min(b) as u32, a.max(b) as u32); extra_edges.insert((a,b)); }

    let mut edges: Vec<Edge3> = Vec::with_capacity(set.len() + extra_edges.len());
    for (a,b) in set { edges.push(Edge3 { a, b, kind: EdgeKind3::Mesh }); }
    for (a,b) in extra_edges { edges.push(Edge3 { a, b, kind: EdgeKind3::Extra }); }
    (nodes, edges)
}

pub fn generate_shells(
    seed: u64,
    num_nodes: usize,
    radii: &[f32],
    probs: &[f32],
    k_intra: usize,
    cross_adj: usize,
    cross_long_ratio: f32,
    hub_ratio: f32,
) -> (Vec<Node3>, Vec<Edge3>) {
    assert!(!radii.is_empty());
    assert_eq!(radii.len(), probs.len());
    let n = num_nodes.max(4);
    // 正規化確率
    let sum_p: f32 = probs.iter().copied().sum();
    let w: Vec<f32> = probs.iter().map(|p| p / sum_p).collect();
    let mut acc = Vec::with_capacity(w.len());
    let mut s = 0.0; for wi in &w { s += *wi; acc.push(s); }

    // 各レイヤの割当数
    let mut rng = Lcg::new(seed);
    let mut layer_of = vec![0usize; n];
    let mut per_layer = vec![0usize; radii.len()];
    for i in 0..n {
        let r = rng.next_f32();
        let mut li = 0usize; while li+1<acc.len() && r>acc[li] { li+=1; }
        layer_of[i] = li; per_layer[li]+=1;
    }

    // レイヤ毎にFibonacci分布
    let mut base_points: Vec<Vec<[f32;3]>> = Vec::with_capacity(radii.len());
    for (i,&cnt) in per_layer.iter().enumerate() {
        let pts = fib_sphere_points(cnt.max(1));
        let r = radii[i];
        let scaled: Vec<[f32;3]> = pts.into_iter().map(|p| [p[0]*r, p[1]*r, p[2]*r]).collect();
        base_points.push(scaled);
    }
    // ノード配置（レイヤ内の循環割当＋微小ジッタ）
    let mut idx_in_layer = vec![0usize; radii.len()];
    let mut nodes: Vec<Node3> = Vec::with_capacity(n);
    for i in 0..n {
        let li = layer_of[i]; let k = idx_in_layer[li]; idx_in_layer[li]+=1; let mut p = base_points[li][k % base_points[li].len()];
        // 微小ジッタ
        let jx = (rng.next_f32() - 0.5) * (radii[li]*0.03);
        let jy = (rng.next_f32() - 0.5) * (radii[li]*0.03);
        let jz = (rng.next_f32() - 0.5) * (radii[li]*0.03);
        p[0]+=jx; p[1]+=jy; p[2]+=jz;
        nodes.push(Node3 { id: i as u32, pos: p });
    }

    // 近傍探索（総当たり）
    let mut edges_intra: HashSet<(u32,u32)> = HashSet::new();
    let mut edges_cross: HashSet<(u32,u32)> = HashSet::new();
    let k = k_intra.max(1).min(12);
    for li in 0..radii.len() {
        // 当該レイヤのインデックス集合
        let idxs: Vec<usize> = (0..n).filter(|&i| layer_of[i]==li).collect();
        for &i in &idxs {
            let mut d: Vec<(f32, usize)> = idxs.iter().copied().filter(|&j| j!=i)
                .map(|j| { let a=nodes[i].pos; let b=nodes[j].pos; let dx=a[0]-b[0]; let dy=a[1]-b[1]; let dz=a[2]-b[2]; (dx*dx+dy*dy+dz*dz, j) })
                .collect();
            d.sort_by(|a,b| a.0.partial_cmp(&b.0).unwrap());
            for m in 0..d.len().min(k) { let j = d[m].1 as u32; let a=i as u32; let b=j; let key=(a.min(b), a.max(b)); edges_intra.insert(key); }
        }
    }

    // 隣接レイヤへの接続
    let ca = cross_adj.min(3);
    for i in 0..n {
        let li = layer_of[i] as isize;
        for dir in [-1isize, 1] {
            let lj = li + dir; if lj<0 || lj>=radii.len() as isize { continue; }
            // 近い順にca本
            let mut cand: Vec<(f32, usize)> = (0..n).filter(|&j| layer_of[j]==lj as usize && j!=i)
                .map(|j| { let a=nodes[i].pos; let b=nodes[j].pos; let dx=a[0]-b[0]; let dy=a[1]-b[1]; let dz=a[2]-b[2]; (dx*dx+dy*dy+dz*dz, j) })
                .collect();
            cand.sort_by(|a,b| a.0.partial_cmp(&b.0).unwrap());
            for m in 0..cand.len().min(ca) { let j=cand[m].1 as u32; let a=i as u32; let b=j; let key=(a.min(b), a.max(b)); edges_cross.insert(key); }
        }
    }

    // ハブ接続（各ハブから近傍を追加）
    let hubs = ((n as f32)*hub_ratio).round().max(1.0) as usize;
    for _ in 0..hubs {
        let i = (rng.next_u32() as usize) % n; let li = layer_of[i];
        let mut d: Vec<(f32, usize)> = (0..n).filter(|&j| layer_of[j]==li && j!=i)
            .map(|j| { let a=nodes[i].pos; let b=nodes[j].pos; let dx=a[0]-b[0]; let dy=a[1]-b[1]; let dz=a[2]-b[2]; (dx*dx+dy*dy+dz*dz, j) })
            .collect();
        d.sort_by(|a,b| a.0.partial_cmp(&b.0).unwrap());
        for m in 0..d.len().min(k+4) { let j=d[m].1 as u32; let a=i as u32; let b=j; let key=(a.min(b), a.max(b)); edges_intra.insert(key); }
    }

    // ランダム長距離
    let extra = ((n as f32)*cross_long_ratio).round() as usize;
    for _ in 0..extra { let a = (rng.next_u32() as usize)%n; let mut b=(rng.next_u32() as usize)%n; if a==b{b=(b+1)%n;} let (a,b)=(a.min(b) as u32, a.max(b) as u32); edges_cross.insert((a,b)); }

    let mut edges: Vec<Edge3> = Vec::with_capacity(edges_intra.len()+edges_cross.len());
    for (a,b) in edges_intra { edges.push(Edge3 { a, b, kind: EdgeKind3::Mesh }); }
    for (a,b) in edges_cross { edges.push(Edge3 { a, b, kind: EdgeKind3::Extra }); }
    (nodes, edges)
}

/// 全ノード対全ノードの無向エッジ集合（a<b, kind=Mesh）を生成する。
pub fn build_all_pairs_edges(nodes: &[Node3]) -> Vec<Edge3> {
    let n = nodes.len() as u32;
    let mut edges = Vec::with_capacity((n.saturating_sub(1) * n / 2) as usize);
    for a in 0..n { for b in (a+1)..n { edges.push(Edge3 { a, b, kind: EdgeKind3::Mesh }); } }
    edges
}

/// 中央核ノード(center)と全ノードを結ぶセグメント（座標ペア）を生成（描画用補助）。
pub fn build_nucleus_segments(nodes: &[Node3], center: [f32;3]) -> Vec<([f32;3],[f32;3])> {
    let mut segs = Vec::with_capacity(nodes.len());
    for n in nodes { segs.push((center, n.pos)); }
    segs
}
