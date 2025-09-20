use std::fs;

// Red: GraphStateから未使用のbglフィールドを排除する
#[test]
fn graph_state_has_no_bgl_field() {
    let lib = fs::read_to_string("src/lib.rs").expect("read src/lib.rs");
    assert!(
        !lib.contains("bgl: wgpu::BindGroupLayout"),
        "GraphState should not keep unused bgl field"
    );
}

