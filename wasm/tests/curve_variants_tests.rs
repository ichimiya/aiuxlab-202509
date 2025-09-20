use wasm_wgpu_demo::graph::curve_variants_for_radius;

#[test]
fn curve_variants_more_near_center() {
    let near = curve_variants_for_radius(0.7);
    let mid  = curve_variants_for_radius(1.0);
    let far  = curve_variants_for_radius(1.35);
    assert!(near.len() > mid.len(), "near <= mid: {} <= {}", near.len(), mid.len());
    assert!(mid.len() >= far.len(), "mid < far: {} < {}", mid.len(), far.len());
}

#[test]
fn curve_variants_include_both_signs_and_thinner() {
    let v = curve_variants_for_radius(0.8);
    // 期待: 少なくとも2本、曲率符号が両方あり、太さ倍率<1のものを含む
    assert!(v.len() >= 2);
    let mut has_pos=false; let mut has_neg=false; let mut has_thin=false;
    for (k, ts) in v { if k>0.0 { has_pos=true; } if k<0.0 { has_neg=true; } if ts<1.0 { has_thin=true; } }
    assert!(has_pos && has_neg && has_thin, "pos:{} neg:{} thin:{}", has_pos, has_neg, has_thin);
}

