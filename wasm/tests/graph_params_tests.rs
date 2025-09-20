use wasm_wgpu_demo::params::{clamp_graph_params, GraphParamInput};

#[test]
fn clamps_and_orders_fog_and_sizes() {
    let inp = GraphParamInput {
        edge_thickness: 0.5, // too large
        node_size: 0.001,    // too small
        flow_speed: 10.0,    // too fast
        fog_start: 1.2,
        fog_end: -0.2,
        fog_strength: -1.0,
        link_on: 1.6,
        link_off: 0.4,
    };
    let out = clamp_graph_params(inp);
    assert!(out.edge_thickness <= 0.05);
    assert!(out.node_size >= 0.01);
    assert!(out.flow_speed <= 5.0);
    // fog in [0,1], start <= end
    assert!(out.fog_start >= 0.0 && out.fog_start <= 1.0);
    assert!(out.fog_end >= 0.0 && out.fog_end <= 1.0);
    assert!(out.fog_start <= out.fog_end);
    // strength >= 0
    assert!(out.fog_strength >= 0.0);
    // link distances ordered and clamped
    assert!(out.link_on <= out.link_off);
}

#[test]
fn fog_strength_is_upper_bounded() {
    let inp = GraphParamInput {
        edge_thickness: 0.01,
        node_size: 0.05,
        flow_speed: 1.0,
        fog_start: 0.2,
        fog_end: 0.8,
        fog_strength: 5.0,
        link_on: 0.2,
        link_off: 0.5,
    };
    let out = clamp_graph_params(inp);
    assert!(out.fog_strength <= 1.0);
}
