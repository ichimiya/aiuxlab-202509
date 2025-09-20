#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Node {
    pub id: u32,
    pub pos: [f32; 2], // NDC: [-1,1]x[-1,1]
    pub level: u8,     // 0: spine, 1+: satellite level
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeKind { Spine, Link }

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Edge {
    pub a: u32,
    pub b: u32,
    pub kind: EdgeKind,
}

// シンプルなLCG（依存ライブラリなし、決定論的）
#[derive(Clone)]
struct Lcg(u64);
impl Lcg {
    fn new(seed: u64) -> Self { Self(seed | 1) }
    fn next_u32(&mut self) -> u32 {
        // Numerical Recipes系 LCG
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.0 >> 32) as u32
    }
    fn next_f32(&mut self) -> f32 { (self.next_u32() as f32) / (u32::MAX as f32) }
    fn range_f32(&mut self, lo: f32, hi: f32) -> f32 { lo + (hi - lo) * self.next_f32() }
    fn pick_usize(&mut self, n: usize) -> usize { (self.next_u32() as usize) % n.max(1) }
}

pub fn generate(seed: u64, num_nodes: usize, spine_segments: usize) -> (Vec<Node>, Vec<Edge>) {
    let n = num_nodes.max(4);
    let spine_n = spine_segments.max(2) + 1; // ノード数 = セグメント+1
    let spine_n = spine_n.min(n);
    let mut rng = Lcg::new(seed);

    let mut nodes = Vec::with_capacity(n);
    let mut edges = Vec::new();

    // 中央スパイン（X≈0の縦ライン）。上下に均等配置しつつ軽微なジッタ。
    for i in 0..spine_n {
        let t = if spine_n <= 1 { 0.0 } else { (i as f32) / ((spine_n - 1) as f32) };
        let y = -0.85 + 1.70 * t; // [-0.85, +0.85]
        let x = rng.range_f32(-0.02, 0.02); // 中心線に小さいジッタ
        nodes.push(Node { id: i as u32, pos: [x, y], level: 0 });
        if i > 0 {
            edges.push(Edge { a: (i - 1) as u32, b: i as u32, kind: EdgeKind::Spine });
        }
    }

    // 残りノードを周辺に散布。各サテライトは最も近いスパインノードへリンク。
    for i in spine_n..n {
        // 放射状に中心近辺へ。半径は0.15..0.85、角度は全域。
        let r = rng.range_f32(0.15, 0.85);
        let th = rng.range_f32(-3.14159, 3.14159);
        let x = r * th.cos() * 0.8; // 横は少し抑える
        let y = r * th.sin() * 0.9;
        nodes.push(Node { id: i as u32, pos: [x, y], level: 1 });

        // 近いスパインを探す
        let mut best = 0usize;
        let mut best_d2 = f32::INFINITY;
        for s in 0..spine_n {
            let dx = nodes[i].pos[0] - nodes[s].pos[0];
            let dy = nodes[i].pos[1] - nodes[s].pos[1];
            let d2 = dx*dx + dy*dy;
            if d2 < best_d2 { best_d2 = d2; best = s; }
        }
        edges.push(Edge { a: nodes[best].id, b: nodes[i].id, kind: EdgeKind::Link });
    }

    // クロスリンク（少量）
    let extra_links = (n as f32 * 0.12) as usize; // 12%
    for _ in 0..extra_links {
        let a = rng.pick_usize(n);
        let mut b = rng.pick_usize(n);
        if a == b { b = (b + 1) % n; }
        edges.push(Edge { a: nodes[a].id, b: nodes[b].id, kind: EdgeKind::Link });
    }

    (nodes, edges)
}

#[derive(Debug, Clone, Copy)]
pub enum Palette { Magenta, Purple, Cyan, Sky, Green }

pub fn palette_color(p: Palette) -> [f32; 4] {
    // sRGB→線形 変換して返す（シェーダは線形空間で合成するため）
    fn srgb_to_linear(c: f32) -> f32 { if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) } }
    fn rgb(r: f32, g: f32, b: f32) -> [f32;4] { [srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0] }
    match p {
        Palette::Magenta => rgb(1.0, 0.0, 1.0),                 // #FF00FF
        Palette::Purple  => rgb(0.75, 0.0, 1.0),                 // ~#BF00FF（おおよそ）
        Palette::Cyan    => rgb(123.0/255.0, 231.0/255.0, 248.0/255.0), // #7BE7F8（指定）
        Palette::Sky     => rgb(0.0, 191.0/255.0, 1.0),          // #00BFFF
        Palette::Green   => rgb(0.2235*1.75, 1.0, 0.078*1.6),    // boosted #39FF14（近似）
    }
}

/// Triangle-strip用のクアッド頂点順序（NDCベース）。
/// これが [-0.5,-0.5], [0.5,-0.5], [-0.5,0.5], [0.5,0.5] の順であることを
/// テストで保証し、描画側の `TriangleStrip` と整合させる。
pub fn quad_corners() -> [(f32, f32); 4] {
    [(-0.5,-0.5),(0.5,-0.5),(-0.5,0.5),(0.5,0.5)]
}

// === Neonテーマ（マゼンタと青の入替版） ===
use crate::graph3d::EdgeKind3;

/// エッジ色: 種別に関わらずCyanで統一
pub fn theme_edge_color(kind: EdgeKind3) -> [f32; 4] {
    let _ = kind; // 現在は種別で分けない
    palette_color(Palette::Cyan)
}

/// ノード色: ハブ(i%23==0)→マゼンタ、通常→シアン
pub fn theme_node_color(index: usize) -> [f32; 4] {
    if index % 23 == 0 { palette_color(Palette::Magenta) } else { palette_color(Palette::Cyan) }
}

/// Graph用のキャンバスクリアカラー（sRGB空間、RGB）
/// 背景を透過させるため黒(0,0,0)を返す。
pub fn graph_clear_color_srgb() -> [f32; 3] {
    [0.0, 0.0, 0.0]
}

/// 透過背景用のクリアカラーのアルファ値。
pub fn graph_clear_alpha() -> f32 {
    0.0
}

// --- curved edges helpers ---
/// 半径に応じて曲線エッジのバリエーション（曲率k, 太さ倍率ts）を返す。
/// 小半径ほど本数を増やし、kの絶対値もやや大きくする。直線は別途1本出す前提。
pub fn curve_variants_for_radius(r: f32) -> Vec<(f32, f32)> {
    let r = r.clamp(0.1, 5.0);
    // 中心寄りほど base 本数を増やす: r=0.6→3, r=1.0→2, r>=1.3→1
    let base = if r < 0.8 { 4 } else if r < 1.1 { 2 } else if r < 1.35 { 1 } else { 0 };
    let mut out = Vec::new();
    if base == 0 { return out; }
    // 曲率の基本振幅（クアッド内でクリッピングしにくい範囲）。
    let a0 = (1.4 - r).max(0.1) * 0.38; // r小 → 大きめ（少し強め）
    // 太さ倍率（曲線は細め）。
    let thin1 = 0.70f32;
    let thin2 = 0.55f32;
    match base {
        4 => { out.push(( a0, thin1)); out.push((-a0, thin1)); out.push(( a0*0.6, thin2)); out.push((-a0*0.6, thin2)); },
        2 => { out.push(( a0, thin1)); out.push((-a0, thin1)); },
        1 => { out.push(( a0*0.8, thin1)); },
        _ => {}
    }
    out
}
