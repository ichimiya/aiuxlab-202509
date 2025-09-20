#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast;
#[cfg(target_arch = "wasm32")]
use web_sys::{window, HtmlCanvasElement};
#[cfg(target_arch = "wasm32")]
use wgpu::util::DeviceExt;

pub mod graph;
pub mod graph3d;
pub mod shader_math;
pub mod params;

#[cfg(target_arch = "wasm32")]
const GRAPH_SHADER_SRC: &str = include_str!("graph_shader.wgsl");

// Graph 3D デフォルト値（外部テストから参照できるよう公開）
pub const DEFAULT_GRAPH_EDGE_THICKNESS: f32 = 0.006;
pub const DEFAULT_GRAPH_NODE_SIZE: f32 = 0.08;
pub const DEFAULT_GRAPH_FLOW_SPEED: f32 = 1.0;
pub const DEFAULT_GRAPH_ROT_SPEED: f32 = 0.04; // 要望: 0.04
pub const DEFAULT_GRAPH_FOG_START: f32 = 0.55;
pub const DEFAULT_GRAPH_FOG_END: f32 = 0.95;
pub const DEFAULT_GRAPH_FOG_STRENGTH: f32 = 0.8; // 要望: 0.8

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct QuadVertex { corner: [f32; 2] }

// (network3d用では未使用のUniforms/2Dグリッド系は削除)

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn bootstrap() {
    let _ = console_log::init_with_level(log::Level::Debug);
    console_error_panic_hook::set_once();
}

// 2D/Alt/Wave用のステートは削除
#[cfg(target_arch = "wasm32")]
thread_local! {
    static STATE_GRAPH: std::cell::RefCell<Option<GraphState>> = std::cell::RefCell::new(None);
}

// Wave/2D用のグリッドやパラメータは削除

// Alt/Wave用のステートは削除

// ---- GRAPH effect (neon network graph) ----
#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct UGraph {
    view_proj: [[f32;4];4],
    misc0: [f32;4], // time, edge_thickness, node_size, flow_speed
    misc1: [f32;4], // aspect, fogStart, fogEnd, fogStrength
    misc2: [f32;4], // link_on, link_off, reserved, reserved
    misc3: [f32;4], // nuc_link_on, nuc_link_off, reserved, reserved
}

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct EdgeInst { p1: [f32; 3], p2: [f32; 3], color: [f32; 4], params: [f32; 3] } // params: (curve_k, thickness_scale, is_nucleus)

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct NodeInst { center: [f32; 3], size: f32, color: [f32; 4], phase: f32 }

#[cfg(target_arch = "wasm32")]
struct GraphState {
    _instance: &'static wgpu::Instance,
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    pipe_edge: wgpu::RenderPipeline,
    pipe_node: wgpu::RenderPipeline,
    bind: wgpu::BindGroup,
    ubo: wgpu::Buffer,
    depth_tex: wgpu::Texture,
    depth_view: wgpu::TextureView,
    quad_vbuf: wgpu::Buffer,
    edge_buf: wgpu::Buffer,
    node_buf: wgpu::Buffer,
    edge_count: u32,
    node_count: u32,
    params: GraphParams,
    edge_mode_allpairs: bool,
    edge_mode_nucleus: bool,
    shell_profile: u32, // 0: default, 1: inner-heavy
}

#[cfg(target_arch = "wasm32")]
#[derive(Clone, Copy)]
struct GraphParams { edge_thickness: f32, node_size: f32, flow_speed: f32, rot_speed: f32, fog_start: f32, fog_end: f32, fog_strength: f32, link_on: f32, link_off: f32, nuc_link_on: f32, nuc_link_off: f32 }


// (removed 2D start)

/* removed resize() */

// ---- ALT effect exports ----
// (removed start_alt)

// removed frame_alt

// removed resize_alt

// ---- WAVE effect (horizon neon lines) ----
// start_wave removed for network3d-only

// (removed frame_wave)

//

/* removed set_wave_params() */

/* removed set_wave_glow() */

/* removed compute_view_proj() */

#[cfg(target_arch = "wasm32")]
fn compute_view_proj_graph(angle: f32, aspect: f32) -> [[f32;4];4] {
    let radius = 3.0;
    let eye = glam::Vec3::new(angle.cos()*radius, 0.9, angle.sin()*radius);
    let target = glam::Vec3::ZERO;
    let up = glam::Vec3::Y;
    let view = glam::Mat4::look_at_rh(eye, target, up);
    let proj = glam::Mat4::perspective_rh(45.0f32.to_radians(), aspect.max(0.1), 0.1, 100.0);
    (proj * view).to_cols_array_2d()
}

/* removed frame() */

// ===================== GRAPH (neon network) =====================
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn start_graph(canvas_id: String) -> Result<(), JsValue> {
    use crate::graph3d::{generate_shells, EdgeKind3};
    use crate::graph::{theme_edge_color, theme_node_color};

    let doc = window().unwrap().document().unwrap();
    let canvas = doc
        .get_element_by_id(&canvas_id)
        .ok_or_else(|| JsValue::from_str("canvas not found"))?
        .dyn_into::<HtmlCanvasElement>()?;
    let width = canvas.client_width() as u32;
    let height = canvas.client_height() as u32;
    canvas.set_width(width.max(1));
    canvas.set_height(height.max(1));

    let instance: &'static wgpu::Instance = Box::leak(Box::new(
        wgpu::Instance::new(&wgpu::InstanceDescriptor::default()),
    ));
    let surface = instance
        .create_surface(wgpu::SurfaceTarget::Canvas(canvas))
        .map_err(|e| JsValue::from_str(&format!("create_surface failed: {e}")))?;
    let adapter = instance
        .request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            force_fallback_adapter: false,
        })
        .await
        .map_err(|e| JsValue::from_str(&format!("request_adapter failed: {e}")))?;
    let (device, queue) = adapter
        .request_device(&wgpu::DeviceDescriptor {
            label: Some("device"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::downlevel_webgl2_defaults().using_resolution(adapter.limits()),
            memory_hints: wgpu::MemoryHints::Performance,
            trace: wgpu::Trace::Off,
        })
        .await
        .map_err(|e| JsValue::from_str(&format!("request_device failed: {e}")))?;

    let caps = surface.get_capabilities(&adapter);
    let format = caps
        .formats
        .iter()
        .copied()
        .find(|f| f.is_srgb())
        .unwrap_or(caps.formats[0]);
    let preferred_alpha_modes = [
        wgpu::CompositeAlphaMode::PreMultiplied,
        wgpu::CompositeAlphaMode::PostMultiplied,
        wgpu::CompositeAlphaMode::Inherit,
    ];
    let alpha_mode = preferred_alpha_modes
        .into_iter()
        .find(|mode| caps.alpha_modes.iter().any(|candidate| candidate == mode))
        .unwrap_or(caps.alpha_modes[0]);

    let config = wgpu::SurfaceConfiguration {
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
        format,
        width,
        height,
        present_mode: wgpu::PresentMode::Fifo,
        alpha_mode,
        view_formats: vec![],
        desired_maximum_frame_latency: 2,
    };
    surface.configure(&device, &config);

    // uniforms & params (デフォルトを定数化)
    let params = GraphParams {
        edge_thickness: DEFAULT_GRAPH_EDGE_THICKNESS,
        node_size: DEFAULT_GRAPH_NODE_SIZE,
        flow_speed: DEFAULT_GRAPH_FLOW_SPEED,
        rot_speed: DEFAULT_GRAPH_ROT_SPEED,
        fog_start: DEFAULT_GRAPH_FOG_START,
        fog_end: DEFAULT_GRAPH_FOG_END,
        fog_strength: DEFAULT_GRAPH_FOG_STRENGTH,
        link_on: 0.80,
        link_off: 1.40,
        nuc_link_on: 0.30,
        nuc_link_off: 2.00,
    };
    let aspect = (width.max(1) as f32) / (height.max(1) as f32);
    let vp = compute_view_proj_graph(0.0, aspect);
    let u_init = UGraph { view_proj: vp, misc0: [0.0, params.edge_thickness, params.node_size, params.flow_speed], misc1: [aspect, params.fog_start, params.fog_end, params.fog_strength], misc2: [params.link_on, params.link_off, 0.0, 0.0], misc3: [params.nuc_link_on, params.nuc_link_off, 0.0, 0.0] };
    let ubo = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("graph_ubo"),
        contents: bytemuck::bytes_of(&u_init),
        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
    });
    let bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("graph_bgl"),
        entries: &[wgpu::BindGroupLayoutEntry {
            binding: 0,
            visibility: wgpu::ShaderStages::VERTEX | wgpu::ShaderStages::FRAGMENT,
            ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Uniform, has_dynamic_offset: false, min_binding_size: None },
            count: None,
        }],
    });
    let bind = device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some("graph_bind"),
        layout: &bgl,
        entries: &[wgpu::BindGroupEntry { binding: 0, resource: ubo.as_entire_binding() }],
    });

    // quad corners
    let quad_data = [
        QuadVertex { corner: [-0.5, -0.5] },
        QuadVertex { corner: [ 0.5, -0.5] },
        QuadVertex { corner: [-0.5,  0.5] },
        QuadVertex { corner: [ 0.5,  0.5] },
    ];
    let quad_vbuf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("graph_quad"),
        contents: bytemuck::cast_slice(&quad_data),
        usage: wgpu::BufferUsages::VERTEX,
    });

    // generate 3D layout (multi-shells)
    let radii = [0.6, 0.8, 1.0, 1.2, 1.4];
    let probs = [0.15, 0.20, 0.30, 0.20, 0.15];
    let (nodes, edges) = generate_shells(1337, 240, &radii, &probs, 4, 1, 0.15, 0.05);
    let mut edge_insts: Vec<EdgeInst> = Vec::with_capacity(edges.len()*3);
    for e in &edges {
        let a = nodes[e.a as usize].pos;
        let b = nodes[e.b as usize].pos;
        let col = theme_edge_color(e.kind);
        // 同シェル/異シェルで太さ・明度を調整
        let (ts_base, col_scale) = match e.kind {
            EdgeKind3::Mesh => (0.85f32, 0.85f32), // 同シェルは少し細く/薄く
            EdgeKind3::Extra => (1.00f32, 1.00f32), // 異シェルは基準
        };
        let col = [col[0]*col_scale, col[1]*col_scale, col[2]*col_scale, col[3]];
        // 直線（k=0, ts=ts_base）
        edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, ts_base, 0.0] });
        // 曲線は全結線モードでは抑制（描画負荷を下げる）
        if false { // placeholder; start_graph 初期構築では常に直線のみ（後で再構築関数で分岐）
            let ra = (a[0]*a[0]+a[1]*a[1]+a[2]*a[2]).sqrt();
            let rb = (b[0]*b[0]+b[1]*b[1]+b[2]*b[2]).sqrt();
            let rm = 0.5*(ra+rb);
            for (k, ts) in crate::graph::curve_variants_for_radius(rm) {
                edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [k, ts*ts_base, 0.0] });
            }
        }
    }
    let mut node_insts: Vec<NodeInst> = Vec::with_capacity(nodes.len());
    let phase_of = |i: usize| -> f32 {
        let mut x = i as u32;
        // xorshift-like hash
        x ^= x >> 16; x = x.wrapping_mul(747796405); x ^= x >> 16; x = x.wrapping_mul(2891336453); x ^= x >> 16;
        (x as f32) / (u32::MAX as f32) * std::f32::consts::TAU
    };
    for (i,n) in nodes.iter().enumerate() {
        let size = 1.0 + if i % 29 == 0 { 0.6 } else { 0.0 }; // たまに大きいハブ
        // 色入替テーマに従う（ハブ→青、通常→マゼンタ）
        let col = theme_node_color(i);
        let phase = phase_of(i);
        node_insts.push(NodeInst { center: n.pos, size, color: col, phase });
    }

    let edge_buf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("edge_buf"),
        contents: bytemuck::cast_slice(&edge_insts),
        usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
    });
    let node_buf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("node_buf"),
        contents: bytemuck::cast_slice(&node_insts),
        usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
    });

    // shader + pipelines
    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some("graph_shader"),
        source: wgpu::ShaderSource::Wgsl(GRAPH_SHADER_SRC.into()),
    });
    let layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: Some("graph_layout"),
        bind_group_layouts: &[&bgl],
        push_constant_ranges: &[],
    });
    let additive = wgpu::BlendState {
        color: wgpu::BlendComponent { src_factor: wgpu::BlendFactor::One, dst_factor: wgpu::BlendFactor::One, operation: wgpu::BlendOperation::Add },
        alpha: wgpu::BlendComponent { src_factor: wgpu::BlendFactor::One, dst_factor: wgpu::BlendFactor::One, operation: wgpu::BlendOperation::Add },
    };
    // edge pipeline
    let edge_layouts = [
        wgpu::VertexBufferLayout { // corners
            array_stride: std::mem::size_of::<QuadVertex>() as u64,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[wgpu::VertexAttribute { shader_location: 0, format: wgpu::VertexFormat::Float32x2, offset: 0 }],
        },
        wgpu::VertexBufferLayout { // EdgeInst
            array_stride: std::mem::size_of::<EdgeInst>() as u64,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                wgpu::VertexAttribute { shader_location: 1, format: wgpu::VertexFormat::Float32x3, offset: 0 },
                wgpu::VertexAttribute { shader_location: 2, format: wgpu::VertexFormat::Float32x3, offset: 12 },
                wgpu::VertexAttribute { shader_location: 3, format: wgpu::VertexFormat::Float32x4, offset: 24 },
                wgpu::VertexAttribute { shader_location: 4, format: wgpu::VertexFormat::Float32x3, offset: 40 },
            ],
        },
    ];
    let depth_fmt = wgpu::TextureFormat::Depth32Float;
    let pipe_edge = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
        label: Some("pipe_edge"),
        layout: Some(&layout),
        vertex: wgpu::VertexState { module: &shader, entry_point: Some("vs_edge"), buffers: &edge_layouts, compilation_options: wgpu::PipelineCompilationOptions::default() },
        fragment: Some(wgpu::FragmentState { module: &shader, entry_point: Some("fs_edge"), targets: &[Some(wgpu::ColorTargetState { format: config.format, blend: Some(additive), write_mask: wgpu::ColorWrites::ALL })], compilation_options: wgpu::PipelineCompilationOptions::default() }),
        primitive: wgpu::PrimitiveState { topology: wgpu::PrimitiveTopology::TriangleStrip, strip_index_format: None, unclipped_depth: false, polygon_mode: wgpu::PolygonMode::Fill, conservative: false, cull_mode: None, front_face: wgpu::FrontFace::Ccw },
        depth_stencil: Some(wgpu::DepthStencilState { format: depth_fmt, depth_write_enabled: false, depth_compare: wgpu::CompareFunction::LessEqual, stencil: wgpu::StencilState::default(), bias: wgpu::DepthBiasState::default() }),
        multisample: wgpu::MultisampleState::default(),
        multiview: None,
        cache: None,
    });
    // node pipeline
    let node_layouts = [
        wgpu::VertexBufferLayout { // corners
            array_stride: std::mem::size_of::<QuadVertex>() as u64,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[wgpu::VertexAttribute { shader_location: 0, format: wgpu::VertexFormat::Float32x2, offset: 0 }],
        },
        wgpu::VertexBufferLayout { // NodeInst
            array_stride: std::mem::size_of::<NodeInst>() as u64,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                wgpu::VertexAttribute { shader_location: 1, format: wgpu::VertexFormat::Float32x3, offset: 0 },
                wgpu::VertexAttribute { shader_location: 2, format: wgpu::VertexFormat::Float32,   offset: 12 },
                wgpu::VertexAttribute { shader_location: 3, format: wgpu::VertexFormat::Float32x4, offset: 16 },
                wgpu::VertexAttribute { shader_location: 4, format: wgpu::VertexFormat::Float32,   offset: 32 },
            ],
        },
    ];
    let pipe_node = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
        label: Some("pipe_node"),
        layout: Some(&layout),
        vertex: wgpu::VertexState { module: &shader, entry_point: Some("vs_node"), buffers: &node_layouts, compilation_options: wgpu::PipelineCompilationOptions::default() },
        fragment: Some(wgpu::FragmentState { module: &shader, entry_point: Some("fs_node"), targets: &[Some(wgpu::ColorTargetState { format: config.format, blend: Some(additive), write_mask: wgpu::ColorWrites::ALL })], compilation_options: wgpu::PipelineCompilationOptions::default() }),
        primitive: wgpu::PrimitiveState { topology: wgpu::PrimitiveTopology::TriangleStrip, strip_index_format: None, unclipped_depth: false, polygon_mode: wgpu::PolygonMode::Fill, conservative: false, cull_mode: None, front_face: wgpu::FrontFace::Ccw },
        depth_stencil: Some(wgpu::DepthStencilState { format: depth_fmt, depth_write_enabled: false, depth_compare: wgpu::CompareFunction::LessEqual, stencil: wgpu::StencilState::default(), bias: wgpu::DepthBiasState::default() }),
        multisample: wgpu::MultisampleState::default(),
        multiview: None,
        cache: None,
    });

    // Depth texture
    let depth_tex = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("depth_tex_graph"),
        size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: depth_fmt,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
        view_formats: &[],
    });
    let depth_view = depth_tex.create_view(&wgpu::TextureViewDescriptor::default());

    STATE_GRAPH.with(|s| {
        *s.borrow_mut() = Some(GraphState {
            _instance: instance, surface, device, queue, config,
            pipe_edge, pipe_node, bind, ubo,
            depth_tex, depth_view,
            quad_vbuf, edge_buf, node_buf,
            edge_count: edge_insts.len() as u32,
            node_count: node_insts.len() as u32,
            params,
            edge_mode_allpairs: false,
            edge_mode_nucleus: false,
            shell_profile: 0,
        });
    });

    Ok(())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn frame_graph(time_ms: f32) -> Result<(), JsValue> {
    STATE_GRAPH.with(|s| -> Result<(), JsValue> {
        let mut borrow = s.borrow_mut();
        let st = borrow.as_mut().ok_or_else(|| JsValue::from_str("not started"))?;
        let t = time_ms * 0.001;
        let aspect = (st.config.width.max(1) as f32) / (st.config.height.max(1) as f32);
        let vp = compute_view_proj_graph(t * st.params.rot_speed, aspect);
        let u = UGraph { view_proj: vp, misc0: [t, st.params.edge_thickness, st.params.node_size, st.params.flow_speed], misc1: [aspect, st.params.fog_start, st.params.fog_end, st.params.fog_strength], misc2: [st.params.link_on, st.params.link_off, 0.0, 0.0], misc3: [st.params.nuc_link_on, st.params.nuc_link_off, 0.0, 0.0] };
        st.queue.write_buffer(&st.ubo, 0, bytemuck::bytes_of(&u));

        let surface_tex = match st.surface.get_current_texture() {
            Ok(t) => t,
            Err(_) => {
                st.surface.configure(&st.device, &st.config);
                st.surface.get_current_texture().map_err(|e| JsValue::from_str(&format!("surface acquire failed: {e}")))?
            }
        };
        let view = surface_tex.texture.create_view(&wgpu::TextureViewDescriptor::default());
        let mut enc = st.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("enc_graph") });
        {
        let mut rp = enc.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("rpass_graph"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: &view,
                resolve_target: None,
                ops: {
                    let c = crate::graph::graph_clear_color_srgb();
                    let a = crate::graph::graph_clear_alpha();
                    wgpu::Operations { load: wgpu::LoadOp::Clear(wgpu::Color { r: c[0] as f64, g: c[1] as f64, b: c[2] as f64, a: a as f64 }), store: wgpu::StoreOp::Store }
                },
            })],
            depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                view: &st.depth_view,
                depth_ops: Some(wgpu::Operations { load: wgpu::LoadOp::Clear(1.0), store: wgpu::StoreOp::Store }),
                stencil_ops: None,
            }),
            occlusion_query_set: None,
            timestamp_writes: None,
        });
            // edges
            rp.set_pipeline(&st.pipe_edge);
            rp.set_bind_group(0, &st.bind, &[]);
            rp.set_vertex_buffer(0, st.quad_vbuf.slice(..));
            rp.set_vertex_buffer(1, st.edge_buf.slice(..));
            rp.draw(0..4, 0..st.edge_count);
            // nodes
            rp.set_pipeline(&st.pipe_node);
            rp.set_bind_group(0, &st.bind, &[]);
            rp.set_vertex_buffer(0, st.quad_vbuf.slice(..));
            rp.set_vertex_buffer(1, st.node_buf.slice(..));
            rp.draw(0..4, 0..st.node_count);
        }
        st.queue.submit(Some(enc.finish()));
        surface_tex.present();
        Ok(())
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn resize_graph(width: u32, height: u32) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            if st.config.width != width || st.config.height != height {
                st.config.width = width.max(1);
                st.config.height = height.max(1);
                st.surface.configure(&st.device, &st.config);
                // recreate depth buffer
                let depth_tex = st.device.create_texture(&wgpu::TextureDescriptor {
                    label: Some("depth_tex_graph"),
                    size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
                    mip_level_count: 1,
                    sample_count: 1,
                    dimension: wgpu::TextureDimension::D2,
                    format: wgpu::TextureFormat::Depth32Float,
                    usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                    view_formats: &[],
                });
                st.depth_view = depth_tex.create_view(&wgpu::TextureViewDescriptor::default());
                st.depth_tex = depth_tex;
            }
        }
    });
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph_params(edge_thickness: f32, node_size: f32, flow_speed: f32) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            st.params.edge_thickness = edge_thickness.max(0.0005).min(0.05);
            st.params.node_size = node_size.max(0.01).min(0.3);
            st.params.flow_speed = flow_speed.max(0.1).min(5.0);
        }
    });
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_params(rot_speed: f32) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            st.params.rot_speed = rot_speed;
        }
    });
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_fog(start: f32, end: f32, strength: f32) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            let mut fs = start.clamp(0.0, 1.0);
            let mut fe = end.clamp(0.0, 1.0);
            if fs > fe { std::mem::swap(&mut fs, &mut fe); }
            st.params.fog_start = fs;
            st.params.fog_end = fe;
            st.params.fog_strength = strength.max(0.0);
        }
    });
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_allpairs(enabled: bool) {
    // 再生成: ノードは同一ルール、エッジのみ全結線 or 通常
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            // 再生成（CPU側）
            let radii = [0.6, 0.8, 1.0, 1.2, 1.4];
            let probs_default = [0.15, 0.20, 0.30, 0.20, 0.15];
            let probs_inner   = [0.34, 0.26, 0.20, 0.12, 0.08];
            let probs = if st.shell_profile==1 { &probs_inner } else { &probs_default };
            let (nodes, base_edges) = crate::graph3d::generate_shells(1337, 240, &radii, probs, 4, 1, 0.15, 0.05);
            let edges = if enabled { crate::graph3d::build_all_pairs_edges(&nodes) } else { base_edges };
            // インスタンス列を再構築（全結線モードでは直線のみ）
            use crate::graph::{theme_edge_color};
            let mut edge_insts: Vec<EdgeInst> = Vec::with_capacity(edges.len() + nodes.len() + 1);
            for e in &edges {
                let a = nodes[e.a as usize].pos;
                let b = nodes[e.b as usize].pos;
                let base_col = theme_edge_color(e.kind);
                let (ts_base, col_scale) = match e.kind {
                    crate::graph3d::EdgeKind3::Mesh => (0.85f32, 0.85f32),
                    crate::graph3d::EdgeKind3::Extra => (1.00f32, 1.00f32),
                };
                let col = [base_col[0]*col_scale, base_col[1]*col_scale, base_col[2]*col_scale, base_col[3]];
                edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, ts_base, 0.0] });
            }
            // overlay nucleus edges if mode is enabled
            if st.edge_mode_nucleus {
                let center = [0.0f32, 0.0, 0.0];
                let segs = crate::graph3d::build_nucleus_segments(&nodes, center);
                let col = theme_edge_color(crate::graph3d::EdgeKind3::Extra);
                for (a,b) in segs { edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, 0.90, 1.0] }); }
            }
            // ノードは色/サイズ計算を再実行
            let mut node_insts: Vec<NodeInst> = Vec::with_capacity(nodes.len());
            let phase_of = |i: usize| -> f32 {
                let mut x = i as u32;
                x ^= x >> 16; x = x.wrapping_mul(747796405); x ^= x >> 16; x = x.wrapping_mul(2891336453); x ^= x >> 16;
                (x as f32) / (u32::MAX as f32) * std::f32::consts::TAU
            };
            for (i,n) in nodes.iter().enumerate() {
                let size = 1.0 + if i % 29 == 0 { 0.6 } else { 0.0 };
                let col = crate::graph::theme_node_color(i);
                let phase = phase_of(i);
                node_insts.push(NodeInst { center: n.pos, size, color: col, phase });
            }
            // GPUバッファ更新
            st.edge_buf = st.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("edge_buf"),
                contents: bytemuck::cast_slice(&edge_insts),
                usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            });
            st.node_buf = st.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("node_buf"),
                contents: bytemuck::cast_slice(&node_insts),
                usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            });
            st.edge_count = edge_insts.len() as u32;
            st.node_count = node_insts.len() as u32;
            st.edge_mode_allpairs = enabled;
        }
    });
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_link_fade(link_on: f32, link_off: f32) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            let mut on = link_on.max(0.0);
            let mut off = link_off.max(0.0);
            if on > off { std::mem::swap(&mut on, &mut off); }
            st.params.link_on = on;
            st.params.link_off = off;
        }
    });
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_nucleus_fade(link_on: f32, link_off: f32) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            let mut on = link_on.max(0.0);
            let mut off = link_off.max(0.0);
            if on > off { std::mem::swap(&mut on, &mut off); }
            st.params.nuc_link_on = on;
            st.params.nuc_link_off = off;
        }
    });
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_nucleus(enabled: bool) {
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            // 再生成（CPU側）ノードのみ取得
            const RADII: [f32;5] = [0.6, 0.8, 1.0, 1.2, 1.4];
            const PROBS_DEFAULT: [f32;5] = [0.15, 0.20, 0.30, 0.20, 0.15];
            const PROBS_INNER: [f32;5]   = [0.34, 0.26, 0.20, 0.12, 0.08];
            let probs = if st.shell_profile==1 { &PROBS_INNER } else { &PROBS_DEFAULT };
            let (nodes, base_edges) = crate::graph3d::generate_shells(1337, 240, &RADII, probs, 4, 1, 0.15, 0.05);
            let edges = if st.edge_mode_allpairs { crate::graph3d::build_all_pairs_edges(&nodes) } else { base_edges };
            // ベースエッジ
            use crate::graph::theme_edge_color;
            let mut edge_insts: Vec<EdgeInst> = Vec::with_capacity(edges.len() + nodes.len() + 1);
            for e in &edges {
                let a = nodes[e.a as usize].pos;
                let b = nodes[e.b as usize].pos;
                let base_col = theme_edge_color(e.kind);
                let (ts_base, col_scale) = match e.kind {
                    crate::graph3d::EdgeKind3::Mesh => (0.85f32, 0.85f32),
                    crate::graph3d::EdgeKind3::Extra => (1.00f32, 1.00f32),
                };
                let col = [base_col[0]*col_scale, base_col[1]*col_scale, base_col[2]*col_scale, base_col[3]];
                edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, ts_base, 0.0] });
            }
            // Nucleus overlay
            let center = [0.0f32, 0.0, 0.0];
            if enabled {
                let segs = crate::graph3d::build_nucleus_segments(&nodes, center);
                let col = theme_edge_color(crate::graph3d::EdgeKind3::Extra);
                for (a,b) in segs { edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, 0.90, 1.0] }); }
            }
            // ノード: 既存ノード + 中央核ノード（大きめ、マゼンタ）
            let mut node_insts: Vec<NodeInst> = Vec::with_capacity(nodes.len()+1);
            let phase_of = |i: usize| -> f32 { let mut x=i as u32; x^=x>>16; x=x.wrapping_mul(747796405); x^=x>>16; x=x.wrapping_mul(2891336453); x^=x>>16; (x as f32)/(u32::MAX as f32)*std::f32::consts::TAU };
            for (i,n) in nodes.iter().enumerate() {
                let size = 1.0 + if i % 29 == 0 { 0.6 } else { 0.0 };
                let coln = crate::graph::theme_node_color(i);
                node_insts.push(NodeInst { center: n.pos, size, color: coln, phase: phase_of(i) });
            }
            // nucleus node（サイズ大/マゼンタ）
            if enabled {
                let nuc_color = crate::graph::palette_color(crate::graph::Palette::Magenta);
                node_insts.push(NodeInst { center: center, size: 2.0, color: nuc_color, phase: 0.0 });
            }
            st.edge_buf = st.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("edge_buf"), contents: bytemuck::cast_slice(&edge_insts), usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST });
            st.node_buf = st.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("node_buf"), contents: bytemuck::cast_slice(&node_insts), usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST });
            st.edge_count = edge_insts.len() as u32;
            st.node_count = node_insts.len() as u32;
            st.edge_mode_nucleus = enabled;
        }
    });
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_graph3d_shell_profile(profile: u32) {
    // 0: default (balanced), 1: inner-heavy
    const RADII: [f32;5] = [0.6, 0.8, 1.0, 1.2, 1.4];
    const PROBS_DEFAULT: [f32;5] = [0.15, 0.20, 0.30, 0.20, 0.15];
    const PROBS_INNER: [f32;5]   = [0.34, 0.26, 0.20, 0.12, 0.08];
    let probs = if profile==1 { &PROBS_INNER } else { &PROBS_DEFAULT };
    STATE_GRAPH.with(|s| {
        if let Some(st) = s.borrow_mut().as_mut() {
            st.shell_profile = if profile==1 { 1 } else { 0 };
            let (nodes, base_edges) = crate::graph3d::generate_shells(1337, 240, &RADII, probs, 4, 1, 0.15, 0.05);
            let edges = if st.edge_mode_allpairs { crate::graph3d::build_all_pairs_edges(&nodes) } else { base_edges };
            // rebuild buffers
            use crate::graph::{theme_edge_color, theme_node_color};
            let mut edge_insts: Vec<EdgeInst> = Vec::with_capacity(edges.len() + nodes.len() + 1);
            for e in &edges {
                let a = nodes[e.a as usize].pos;
                let b = nodes[e.b as usize].pos;
                let base_col = theme_edge_color(e.kind);
                let (ts_base, col_scale) = match e.kind {
                    crate::graph3d::EdgeKind3::Mesh => (0.85f32, 0.85f32),
                    crate::graph3d::EdgeKind3::Extra => (1.00f32, 1.00f32),
                };
                let col = [base_col[0]*col_scale, base_col[1]*col_scale, base_col[2]*col_scale, base_col[3]];
                edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, ts_base, 0.0] });
            }
            if st.edge_mode_nucleus {
                let center = [0.0f32, 0.0, 0.0];
                let segs = crate::graph3d::build_nucleus_segments(&nodes, center);
                let col = theme_edge_color(crate::graph3d::EdgeKind3::Extra);
                for (a,b) in segs { edge_insts.push(EdgeInst { p1: a, p2: b, color: col, params: [0.0, 0.90, 1.0] }); }
            }
            let mut node_insts: Vec<NodeInst> = Vec::with_capacity(nodes.len());
            let phase_of = |i: usize| -> f32 {
                let mut x = i as u32; x ^= x >> 16; x = x.wrapping_mul(747796405); x ^= x >> 16; x = x.wrapping_mul(2891336453); x ^= x >> 16;
                (x as f32) / (u32::MAX as f32) * std::f32::consts::TAU
            };
            for (i,n) in nodes.iter().enumerate() {
                let size = 1.0 + if i % 29 == 0 { 0.6 } else { 0.0 };
                let col = theme_node_color(i);
                let phase = phase_of(i);
                node_insts.push(NodeInst { center: n.pos, size, color: col, phase });
            }
            st.edge_buf = st.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("edge_buf"), contents: bytemuck::cast_slice(&edge_insts), usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST });
            st.node_buf = st.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("node_buf"), contents: bytemuck::cast_slice(&node_insts), usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST });
            st.edge_count = edge_insts.len() as u32;
            st.node_count = node_insts.len() as u32;
        }
    });
}
