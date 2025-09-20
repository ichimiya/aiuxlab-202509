// CPU側テスト用の簡易ノード強度計算（WGSLと同等の式）
pub fn node_intensity(d_norm: f32, t: f32) -> f32 {
    let d = d_norm.max(0.0);
    let core = smoothstep(1.0, 0.0, d);
    let glow = (-4.0 * d * d).exp();
    let spark = 0.35 + 0.65 * (t * std::f32::consts::TAU).sin();
    core * 1.4 + glow * 0.5 * spark
}

fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
    let t = ((x - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

// グラフのドリフト（WGSLと一致する式）
pub fn drift_position(p: [f32;3], t: f32, speed: f32) -> [f32;3] {
    // 穏やかなドリフト: 振幅は半径に比例、速度は抑制係数を掛ける
    let w = t * speed * 0.3; // ゆっくり
    let k1 = [1.7_f32, 2.3, 1.3];
    let k2 = [1.2_f32, 2.9, 1.7];
    let k3 = [1.9_f32, 1.1, 2.6];
    let dot1 = p[0]*k1[0] + p[1]*k1[1] + p[2]*k1[2];
    let dot2 = p[0]*k2[0] + p[1]*k2[1] + p[2]*k2[2];
    let dot3 = p[0]*k3[0] + p[1]*k3[1] + p[2]*k3[2];
    let r = (p[0]*p[0]+p[1]*p[1]+p[2]*p[2]).sqrt();
    let amp = 0.03_f32 * r; // 半径に比例し、角度変化を穏やかに
    [
        amp * (dot1 + w).sin(),
        amp * (dot2 + w*1.137).sin(),
        amp * (dot3 + w*0.873).sin(),
    ]
}

// エッジのリンク強度（距離ベースのフェード）
pub fn link_strength(dist: f32, on: f32, off: f32) -> f32 {
    let on = on.min(off - 1e-6);
    let t = ((dist - on) / (off - on)).clamp(0.0, 1.0);
    1.0 - (t * t * (3.0 - 2.0 * t)) // 1 - smoothstep(on, off, dist)
}

// 中心から外へ行くほど弱くなる強度（下限minを設ける）
pub fn radial_strength(r: f32, r0: f32, r1: f32, min_strength: f32) -> f32 {
    let r0 = r0.min(r1 - 1e-6);
    let min = min_strength.clamp(0.0, 1.0);
    let t = ((r - r0) / (r1 - r0)).clamp(0.0, 1.0);
    let s = 1.0 - (t * t * (3.0 - 2.0 * t)); // 1 - smoothstep(r0, r1, r)
    min + (1.0 - min) * s
}
