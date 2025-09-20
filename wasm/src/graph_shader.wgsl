struct UGraph {
  view_proj: mat4x4<f32>,
  misc0: vec4<f32>,   // x: time, y: edge_thickness (NDC), z: node_size (NDC), w: flow_speed
  misc1: vec4<f32>,   // x: aspect, y: fogStart, z: fogEnd, w: fogStrength
  misc2: vec4<f32>,   // x: link_on, y: link_off, z,w: reserved
  misc3: vec4<f32>,   // x: nuc_link_on, y: nuc_link_off, z,w: reserved
};
@group(0) @binding(0) var<uniform> u: UGraph;

fn hash31(x: vec3<f32>) -> vec3<f32> {
  let q = vec3<f32>(
    dot(x, vec3<f32>(12.9898, 78.233, 37.719)),
    dot(x, vec3<f32>(39.346 , 11.135, 83.155)),
    dot(x, vec3<f32>(73.156 , 52.235,  9.151))
  );
  let s = sin(q) * 43758.5453;
  return fract(s);
}

fn drift(p: vec3<f32>, time: f32, speed: f32) -> vec3<f32> {
  // 各ノードの基準点付近でランダムに動く（球面上の接線方向）。
  let r = length(p);
  if (r < 1e-6) { return vec3<f32>(0.0); }
  let n = p / r;
  // 接線基底
  var up = vec3<f32>(0.0, 1.0, 0.0);
  if (abs(n.y) > 0.99) { up = vec3<f32>(1.0, 0.0, 0.0); }
  let t1 = normalize(cross(n, up));
  let t2 = normalize(cross(n, t1));
  // 擬似乱数の位相/周波数/振幅
  let h = hash31(p);
  let w = time * speed * 0.35;
  let amp = 0.025 * r * (0.6 + 0.4*h.x);
  let f1 = 1.2 + 0.8*h.y;
  let f2 = 1.6 + 0.6*h.z;
  // 接線方向の合成
  let off = t1 * (amp * sin(w * f1 + 6.28318*h.x)) +
            t2 * (amp * cos(w * f2 + 6.28318*h.y));
  return off;
}

// ========== Edge (oriented quad) ==========
struct VInEdge {
  @location(0) corner: vec2<f32>,           // [-0.5..0.5]x[-0.5..0.5]
  @location(1) p1: vec3<f32>,               // object space
  @location(2) p2: vec3<f32>,
  @location(3) color: vec4<f32>,            // linear sRGB
  @location(4) eparams: vec3<f32>,          // x: curve_k, y: thickness scale, z: is_nucleus(0/1)
};
struct VOutEdge {
  @builtin(position) pos: vec4<f32>,
  @location(0) v_color: vec4<f32>,
  @location(1) v_uv: vec2<f32>,             // x: along [0..1], y: across [-1..1]
  @location(2) v_depth: f32,                // ndc.z in [-1,1] (GL-style), but we use as-is
  @location(3) v_link: f32,                 // 距離に基づく表示強度（0..1）
  @location(4) v_curv: f32,
  @location(5) v_tscale: f32,
  @location(6) v_rstr: f32,                 // 半径による強度（中心→外で弱く）
};

@vertex
fn vs_edge(inp: VInEdge) -> VOutEdge {
  // Transform to NDC
  // 球面上を滑るようにドリフト（半径は維持）
  let r_p1 = length(inp.p1);
  let r_p2 = length(inp.p2);
  let off1 = drift(inp.p1, u.misc0.x, u.misc0.w);
  let off2 = drift(inp.p2, u.misc0.x, u.misc0.w);
  let p1 = select(vec3<f32>(0.0), normalize(inp.p1 + off1) * r_p1, r_p1 >= 1e-6);
  let p2 = select(vec3<f32>(0.0), normalize(inp.p2 + off2) * r_p2, r_p2 >= 1e-6);
  let ca = u.view_proj * vec4<f32>(p1, 1.0);
  let cb = u.view_proj * vec4<f32>(p2, 1.0);
  var a = ca.xyz / ca.w; // ndc
  var b = cb.xyz / cb.w;
  // link強度: 距離が近いペアのみ残す（スムーズにフェード）
  let dist = distance(p1, p2);
  let base_link = 1.0 - smoothstep(u.misc2.x, u.misc2.y, dist);
  let nuc_link  = 1.0 - smoothstep(u.misc3.x, u.misc3.y, dist);
  let vlink = select(base_link, nuc_link, inp.eparams.z > 0.5);
  // radial強度: 中心→外側で弱く。下限minを設ける
  let r_mid = 0.5 * (length(p1) + length(p2));
  let rf0: f32 = 0.6; let rf1: f32 = 1.4; let rmin: f32 = 0.35; // renamed to avoid clash with r1 above
  let s = 1.0 - smoothstep(rf0, rf1, r_mid);
  let vr = rmin + (1.0 - rmin) * s;
  // isotropic distance in screen: scale x by aspect
  let asp = u.misc1.x;
  let a2 = vec2<f32>(a.x * asp, a.y);
  let b2 = vec2<f32>(b.x * asp, b.y);
  let dir = b2 - a2;
  let len = max(length(dir), 1e-4);
  let t = (inp.corner.x + 0.5);            // [0,1]
  let side = inp.corner.y * 2.0;           // [-1,1]
  let ortho = vec2<f32>(-dir.y, dir.x) / len; // left normal (screen space)
  let along2 = a2 + dir * t;
  // 放射方向でも少し細く（外側ほど薄い）
  let t_rad = 0.6 + 0.4 * vr; // center=1.0, outer=0.6
  let thickness = u.misc0.y * inp.eparams.y * t_rad; // 曲線は細く＋外側でさらに細く
  let world2 = along2 + ortho * side * thickness; // in scaled screen space
  // revert aspect scaling for x
  let world = vec2<f32>(world2.x / asp, world2.y);
  let z = mix(a.z, b.z, t);
  var out: VOutEdge;
  out.pos = vec4<f32>(world, z, 1.0);
  out.v_color = inp.color;
  out.v_uv = vec2<f32>(t, side);
  out.v_depth = z;
  out.v_link = vlink;
  out.v_curv = inp.eparams.x;
  out.v_tscale = inp.eparams.y;
  out.v_rstr = vr;
  return out;
}

@fragment
fn fs_edge(inp: VOutEdge) -> @location(0) vec4<f32> {
  // 横方向ガウシアンっぽい減衰 + 沿い方向のフロー縞
  let t = inp.v_uv.x;
  // 緩い放物線オフセット（端0、中心最大）
  let curve = (inp.v_curv * 0.9) * (4.0 * t * (1.0 - t));
  let y = abs(inp.v_uv.y - curve);
  // 線の細さに応じてガウシアン幅を調整（細いほどシャープ）
  let k_core = 12.0 / max(inp.v_tscale, 0.5);
  let k_glow = 2.5 / max(inp.v_tscale, 0.5);
  let core = exp(-k_core * y * y);              // 中心光
  let glow = exp(-k_glow * y * y);
  let flow = 0.65 + 0.35 * sin( (inp.v_uv.x * 40.0) - u.misc0.x * u.misc0.w * 6.28318 );
  var col = inp.v_color.rgb * (core * 1.3 + glow * 0.6 * flow) * inp.v_link * inp.v_rstr;
  // fog based on ndc.z mapped to [0,1]
  let depth01 = clamp(0.5 * (inp.v_depth + 1.0), 0.0, 1.0);
  let f = smoothstep(u.misc1.y, u.misc1.z, depth01) * u.misc1.w;
  col *= (1.0 - f);
  return vec4<f32>(col, 1.0);
}

// ========== Node (glowy disk) ==========
struct VInNode {
  @location(0) corner: vec2<f32>,
  @location(1) center: vec3<f32>,          // object space center
  @location(2) size: f32,
  @location(3) color: vec4<f32>,
  @location(4) phase: f32,
};
struct VOutNode {
  @builtin(position) pos: vec4<f32>,
  @location(0) v_color: vec4<f32>,
  @location(1) v_local: vec2<f32>,
  @location(2) v_r: f32,                // 半径 = 0.5 * size * u.node_size
  @location(3) v_depth: f32,
  @location(4) v_phase: f32,
};

@vertex
fn vs_node(inp: VInNode) -> VOutNode {
  // project center with drift
  let rc = length(inp.center);
  let offc = drift(inp.center, u.misc0.x, u.misc0.w);
  let center = select(vec3<f32>(0.0), normalize(inp.center + offc) * rc, rc >= 1e-6);
  let clip = u.view_proj * vec4<f32>(center, 1.0);
  let ndc = clip.xyz / clip.w;
  let size = inp.size * u.misc0.z;
  let local = inp.corner * size;            // in NDC units
  var out: VOutNode;
  out.pos = vec4<f32>(ndc.xy + local, ndc.z, 1.0);
  out.v_color = inp.color;
  out.v_local = local;
  out.v_r = 0.5 * size; // 正規化用半径（辺の中心まで=1）
  out.v_depth = ndc.z;
  out.v_phase = inp.phase;
  return out;
}

@fragment
fn fs_node(inp: VOutNode) -> @location(0) vec4<f32> {
  // 正規化距離: 辺の中心で d=1, 円の外側(d>1)はほぼ0へ
  let d = length(inp.v_local) / max(inp.v_r, 1e-6);
  let core = smoothstep(1.0, 0.0, d);           // 中心から滑らかに0へ
  let glow = exp(-4.0 * d * d);                 // ソフトグロー
  let spark = 0.35 + 0.65 * sin(u.misc0.x * 6.28318);
  let intensity = core * 1.4 + glow * 0.5 * sin(u.misc0.x * 6.28318 + inp.v_phase);
  var col = inp.v_color.rgb * intensity;
  let depth01 = clamp(0.5 * (inp.v_depth + 1.0), 0.0, 1.0);
  let f = smoothstep(u.misc1.y, u.misc1.z, depth01) * u.misc1.w;
  col *= (1.0 - f);
  return vec4<f32>(col, 1.0);
}
