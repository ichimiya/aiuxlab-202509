#[derive(Debug, Clone, Copy)]
pub struct GraphParamInput {
    pub edge_thickness: f32,
    pub node_size: f32,
    pub flow_speed: f32,
    pub fog_start: f32,
    pub fog_end: f32,
    pub fog_strength: f32,
    pub link_on: f32,
    pub link_off: f32,
}

#[derive(Debug, Clone, Copy)]
pub struct GraphParamOutput {
    pub edge_thickness: f32,
    pub node_size: f32,
    pub flow_speed: f32,
    pub fog_start: f32,
    pub fog_end: f32,
    pub fog_strength: f32,
    pub link_on: f32,
    pub link_off: f32,
}

pub fn clamp_graph_params(inp: GraphParamInput) -> GraphParamOutput {
    let edge_thickness = inp.edge_thickness.clamp(0.0005, 0.05);
    let node_size = inp.node_size.clamp(0.01, 0.3);
    let flow_speed = inp.flow_speed.clamp(0.1, 5.0);
    let mut fog_start = inp.fog_start.clamp(0.0, 1.0);
    let mut fog_end = inp.fog_end.clamp(0.0, 1.0);
    if fog_start > fog_end { std::mem::swap(&mut fog_start, &mut fog_end); }
    let fog_strength = inp.fog_strength.clamp(0.0, 1.0);
    // link distances: clamp to reasonable range and order
    let mut link_on = inp.link_on.clamp(0.0, 3.0);
    let mut link_off = inp.link_off.clamp(0.0, 3.0);
    if link_on > link_off { std::mem::swap(&mut link_on, &mut link_off); }
    GraphParamOutput { edge_thickness, node_size, flow_speed, fog_start, fog_end, fog_strength, link_on, link_off }
}
