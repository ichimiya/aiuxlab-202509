// デフォルトの回転速度とフォグ強度の定数を検証する
use wasm_wgpu_demo::{
    DEFAULT_GRAPH_ROT_SPEED,
    DEFAULT_GRAPH_FOG_STRENGTH,
};

#[test]
fn default_rotation_and_fog_strength_values() {
    assert!((DEFAULT_GRAPH_ROT_SPEED - 0.04).abs() < 1e-6);
    assert!((DEFAULT_GRAPH_FOG_STRENGTH - 0.8).abs() < 1e-6);
}

