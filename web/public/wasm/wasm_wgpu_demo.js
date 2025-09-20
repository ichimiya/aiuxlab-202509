let wasm;

function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_export_2.set(idx, obj);
  return idx;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null ||
    cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

let cachedTextDecoder =
  typeof TextDecoder !== "undefined"
    ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true })
    : {
        decode: () => {
          throw Error("TextDecoder not available");
        },
      };

if (typeof TextDecoder !== "undefined") {
  cachedTextDecoder.decode();
}

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder =
      typeof TextDecoder !== "undefined"
        ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true })
        : {
            decode: () => {
              throw Error("TextDecoder not available");
            },
          };
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(
    getUint8ArrayMemory0().subarray(ptr, ptr + len),
  );
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder =
  typeof TextEncoder !== "undefined"
    ? new TextEncoder("utf-8")
    : {
        encode: () => {
          throw Error("TextEncoder not available");
        },
      };

const encodeString =
  typeof cachedTextEncoder.encodeInto === "function"
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length,
        };
      };

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
  if (
    cachedUint32ArrayMemory0 === null ||
    cachedUint32ArrayMemory0.byteLength === 0
  ) {
    cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32ArrayMemory0;
}

function getArrayU32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function debugString(val) {
  // primitive types
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val);
  }
  if (className == "Object") {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`;
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className;
}

const CLOSURE_DTORS =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((state) => {
        wasm.__wbindgen_export_6.get(state.dtor)(state.a, state.b);
      });

function makeMutClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor };
  const real = (...args) => {
    // First up with a closure we increment the internal reference
    // count. This ensures that the Rust closure environment won't
    // be deallocated while we're invoking it.
    state.cnt++;
    const a = state.a;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      if (--state.cnt === 0) {
        wasm.__wbindgen_export_6.get(state.dtor)(a, state.b);
        CLOSURE_DTORS.unregister(state);
      } else {
        state.a = a;
      }
    }
  };
  real.original = state;
  CLOSURE_DTORS.register(real, state, state);
  return real;
}

export function bootstrap() {
  wasm.bootstrap();
}

/**
 * @param {string} canvas_id
 * @returns {Promise<void>}
 */
export function start_graph(canvas_id) {
  const ptr0 = passStringToWasm0(
    canvas_id,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.start_graph(ptr0, len0);
  return ret;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_export_2.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}
/**
 * @param {number} time_ms
 */
export function frame_graph(time_ms) {
  const ret = wasm.frame_graph(time_ms);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
}

/**
 * @param {number} width
 * @param {number} height
 */
export function resize_graph(width, height) {
  wasm.resize_graph(width, height);
}

/**
 * @param {number} edge_thickness
 * @param {number} node_size
 * @param {number} flow_speed
 */
export function set_graph_params(edge_thickness, node_size, flow_speed) {
  wasm.set_graph_params(edge_thickness, node_size, flow_speed);
}

/**
 * @param {number} rot_speed
 */
export function set_graph3d_params(rot_speed) {
  wasm.set_graph3d_params(rot_speed);
}

/**
 * @param {number} start
 * @param {number} end
 * @param {number} strength
 */
export function set_graph3d_fog(start, end, strength) {
  wasm.set_graph3d_fog(start, end, strength);
}

/**
 * @param {boolean} enabled
 */
export function set_graph3d_allpairs(enabled) {
  wasm.set_graph3d_allpairs(enabled);
}

/**
 * @param {number} link_on
 * @param {number} link_off
 */
export function set_graph3d_link_fade(link_on, link_off) {
  wasm.set_graph3d_link_fade(link_on, link_off);
}

/**
 * @param {number} link_on
 * @param {number} link_off
 */
export function set_graph3d_nucleus_fade(link_on, link_off) {
  wasm.set_graph3d_nucleus_fade(link_on, link_off);
}

/**
 * @param {boolean} enabled
 */
export function set_graph3d_nucleus(enabled) {
  wasm.set_graph3d_nucleus(enabled);
}

/**
 * @param {number} profile
 */
export function set_graph3d_shell_profile(profile) {
  wasm.set_graph3d_shell_profile(profile);
}

function __wbg_adapter_6(arg0, arg1, arg2) {
  wasm.closure72_externref_shim(arg0, arg1, arg2);
}

function __wbg_adapter_491(arg0, arg1, arg2, arg3) {
  wasm.closure87_externref_shim(arg0, arg1, arg2, arg3);
}

const __wbindgen_enum_GpuBlendFactor = [
  "zero",
  "one",
  "src",
  "one-minus-src",
  "src-alpha",
  "one-minus-src-alpha",
  "dst",
  "one-minus-dst",
  "dst-alpha",
  "one-minus-dst-alpha",
  "src-alpha-saturated",
  "constant",
  "one-minus-constant",
  "src1",
  "one-minus-src1",
  "src1-alpha",
  "one-minus-src1-alpha",
];

const __wbindgen_enum_GpuBlendOperation = [
  "add",
  "subtract",
  "reverse-subtract",
  "min",
  "max",
];

const __wbindgen_enum_GpuBufferBindingType = [
  "uniform",
  "storage",
  "read-only-storage",
];

const __wbindgen_enum_GpuCanvasAlphaMode = ["opaque", "premultiplied"];

const __wbindgen_enum_GpuCompareFunction = [
  "never",
  "less",
  "equal",
  "less-equal",
  "greater",
  "not-equal",
  "greater-equal",
  "always",
];

const __wbindgen_enum_GpuCullMode = ["none", "front", "back"];

const __wbindgen_enum_GpuFrontFace = ["ccw", "cw"];

const __wbindgen_enum_GpuIndexFormat = ["uint16", "uint32"];

const __wbindgen_enum_GpuLoadOp = ["load", "clear"];

const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];

const __wbindgen_enum_GpuPrimitiveTopology = [
  "point-list",
  "line-list",
  "line-strip",
  "triangle-list",
  "triangle-strip",
];

const __wbindgen_enum_GpuSamplerBindingType = [
  "filtering",
  "non-filtering",
  "comparison",
];

const __wbindgen_enum_GpuStencilOperation = [
  "keep",
  "zero",
  "replace",
  "invert",
  "increment-clamp",
  "decrement-clamp",
  "increment-wrap",
  "decrement-wrap",
];

const __wbindgen_enum_GpuStorageTextureAccess = [
  "write-only",
  "read-only",
  "read-write",
];

const __wbindgen_enum_GpuStoreOp = ["store", "discard"];

const __wbindgen_enum_GpuTextureAspect = ["all", "stencil-only", "depth-only"];

const __wbindgen_enum_GpuTextureDimension = ["1d", "2d", "3d"];

const __wbindgen_enum_GpuTextureFormat = [
  "r8unorm",
  "r8snorm",
  "r8uint",
  "r8sint",
  "r16uint",
  "r16sint",
  "r16float",
  "rg8unorm",
  "rg8snorm",
  "rg8uint",
  "rg8sint",
  "r32uint",
  "r32sint",
  "r32float",
  "rg16uint",
  "rg16sint",
  "rg16float",
  "rgba8unorm",
  "rgba8unorm-srgb",
  "rgba8snorm",
  "rgba8uint",
  "rgba8sint",
  "bgra8unorm",
  "bgra8unorm-srgb",
  "rgb9e5ufloat",
  "rgb10a2uint",
  "rgb10a2unorm",
  "rg11b10ufloat",
  "rg32uint",
  "rg32sint",
  "rg32float",
  "rgba16uint",
  "rgba16sint",
  "rgba16float",
  "rgba32uint",
  "rgba32sint",
  "rgba32float",
  "stencil8",
  "depth16unorm",
  "depth24plus",
  "depth24plus-stencil8",
  "depth32float",
  "depth32float-stencil8",
  "bc1-rgba-unorm",
  "bc1-rgba-unorm-srgb",
  "bc2-rgba-unorm",
  "bc2-rgba-unorm-srgb",
  "bc3-rgba-unorm",
  "bc3-rgba-unorm-srgb",
  "bc4-r-unorm",
  "bc4-r-snorm",
  "bc5-rg-unorm",
  "bc5-rg-snorm",
  "bc6h-rgb-ufloat",
  "bc6h-rgb-float",
  "bc7-rgba-unorm",
  "bc7-rgba-unorm-srgb",
  "etc2-rgb8unorm",
  "etc2-rgb8unorm-srgb",
  "etc2-rgb8a1unorm",
  "etc2-rgb8a1unorm-srgb",
  "etc2-rgba8unorm",
  "etc2-rgba8unorm-srgb",
  "eac-r11unorm",
  "eac-r11snorm",
  "eac-rg11unorm",
  "eac-rg11snorm",
  "astc-4x4-unorm",
  "astc-4x4-unorm-srgb",
  "astc-5x4-unorm",
  "astc-5x4-unorm-srgb",
  "astc-5x5-unorm",
  "astc-5x5-unorm-srgb",
  "astc-6x5-unorm",
  "astc-6x5-unorm-srgb",
  "astc-6x6-unorm",
  "astc-6x6-unorm-srgb",
  "astc-8x5-unorm",
  "astc-8x5-unorm-srgb",
  "astc-8x6-unorm",
  "astc-8x6-unorm-srgb",
  "astc-8x8-unorm",
  "astc-8x8-unorm-srgb",
  "astc-10x5-unorm",
  "astc-10x5-unorm-srgb",
  "astc-10x6-unorm",
  "astc-10x6-unorm-srgb",
  "astc-10x8-unorm",
  "astc-10x8-unorm-srgb",
  "astc-10x10-unorm",
  "astc-10x10-unorm-srgb",
  "astc-12x10-unorm",
  "astc-12x10-unorm-srgb",
  "astc-12x12-unorm",
  "astc-12x12-unorm-srgb",
];

const __wbindgen_enum_GpuTextureSampleType = [
  "float",
  "unfilterable-float",
  "depth",
  "sint",
  "uint",
];

const __wbindgen_enum_GpuTextureViewDimension = [
  "1d",
  "2d",
  "2d-array",
  "cube",
  "cube-array",
  "3d",
];

const __wbindgen_enum_GpuVertexFormat = [
  "uint8",
  "uint8x2",
  "uint8x4",
  "sint8",
  "sint8x2",
  "sint8x4",
  "unorm8",
  "unorm8x2",
  "unorm8x4",
  "snorm8",
  "snorm8x2",
  "snorm8x4",
  "uint16",
  "uint16x2",
  "uint16x4",
  "sint16",
  "sint16x2",
  "sint16x4",
  "unorm16",
  "unorm16x2",
  "unorm16x4",
  "snorm16",
  "snorm16x2",
  "snorm16x4",
  "float16",
  "float16x2",
  "float16x4",
  "float32",
  "float32x2",
  "float32x3",
  "float32x4",
  "uint32",
  "uint32x2",
  "uint32x3",
  "uint32x4",
  "sint32",
  "sint32x2",
  "sint32x3",
  "sint32x4",
  "unorm10-10-10-2",
  "unorm8x4-bgra",
];

const __wbindgen_enum_GpuVertexStepMode = ["vertex", "instance"];

const EXPECTED_RESPONSE_TYPES = new Set(["basic", "cors", "default"]);

async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse =
          module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

        if (
          validResponse &&
          module.headers.get("Content-Type") !== "application/wasm"
        ) {
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            e,
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}

function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbg_Window_9e7ea8667e28eb00 = function (arg0) {
    const ret = arg0.Window;
    return ret;
  };
  imports.wbg.__wbg_WorkerGlobalScope_0169ffb9adb5f5ef = function (arg0) {
    const ret = arg0.WorkerGlobalScope;
    return ret;
  };
  imports.wbg.__wbg_beginRenderPass_aefd0d9681a1f010 = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.beginRenderPass(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_buffer_1f897e9f3ed6b41d = function (arg0) {
    const ret = arg0.buffer;
    return ret;
  };
  imports.wbg.__wbg_call_2f8d426a20a307fe = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.call(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_call_f53f0647ceb9c567 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = arg0.call(arg1, arg2);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_clientHeight_749c25891626207c = function (arg0) {
    const ret = arg0.clientHeight;
    return ret;
  };
  imports.wbg.__wbg_clientWidth_e375fa1cadea7de4 = function (arg0) {
    const ret = arg0.clientWidth;
    return ret;
  };
  imports.wbg.__wbg_configure_86dd92dde48d105a = function () {
    return handleError(function (arg0, arg1) {
      arg0.configure(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_createBindGroupLayout_f0635625a1a82bea = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.createBindGroupLayout(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_createBindGroup_043b06d20124f91e = function (arg0, arg1) {
    const ret = arg0.createBindGroup(arg1);
    return ret;
  };
  imports.wbg.__wbg_createBuffer_086a8bb05ced884a = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.createBuffer(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_createCommandEncoder_aa9ae9d445bb7abf = function (
    arg0,
    arg1,
  ) {
    const ret = arg0.createCommandEncoder(arg1);
    return ret;
  };
  imports.wbg.__wbg_createPipelineLayout_5cc7e994e46201c7 = function (
    arg0,
    arg1,
  ) {
    const ret = arg0.createPipelineLayout(arg1);
    return ret;
  };
  imports.wbg.__wbg_createRenderPipeline_47152f2f57b11194 = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.createRenderPipeline(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_createShaderModule_9ec201507fe4949e = function (
    arg0,
    arg1,
  ) {
    const ret = arg0.createShaderModule(arg1);
    return ret;
  };
  imports.wbg.__wbg_createTexture_09f18232c5ad6e69 = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.createTexture(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_createView_f7cd0a0356a46f3b = function () {
    return handleError(function (arg0, arg1) {
      const ret = arg0.createView(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_debug_9a166dc82b4ba6a6 = function (arg0) {
    console.debug(arg0);
  };
  imports.wbg.__wbg_document_a6efcd95d74a2ff6 = function (arg0) {
    const ret = arg0.document;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_draw_d38c9207eb049f56 = function (
    arg0,
    arg1,
    arg2,
    arg3,
    arg4,
  ) {
    arg0.draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
  };
  imports.wbg.__wbg_end_d54348baf0bf3b70 = function (arg0) {
    arg0.end();
  };
  imports.wbg.__wbg_error_41f0589870426ea4 = function (arg0) {
    console.error(arg0);
  };
  imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function (arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
      deferred0_0 = arg0;
      deferred0_1 = arg1;
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
  };
  imports.wbg.__wbg_finish_db34a19c90c07af7 = function (arg0) {
    const ret = arg0.finish();
    return ret;
  };
  imports.wbg.__wbg_finish_e2d3808af76b422a = function (arg0, arg1) {
    const ret = arg0.finish(arg1);
    return ret;
  };
  imports.wbg.__wbg_getContext_01c6e219410d4783 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments);
  };
  imports.wbg.__wbg_getContext_33aaf9e907ebffe9 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments);
  };
  imports.wbg.__wbg_getCurrentTexture_6ee19b05d6ba43ba = function () {
    return handleError(function (arg0) {
      const ret = arg0.getCurrentTexture();
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_getElementById_3d4c5912da7c64a4 = function (
    arg0,
    arg1,
    arg2,
  ) {
    const ret = arg0.getElementById(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_getMappedRange_b986a889b6b53379 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = arg0.getMappedRange(arg1, arg2);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_getPreferredCanvasFormat_c56b5a9a243fe942 = function (
    arg0,
  ) {
    const ret = arg0.getPreferredCanvasFormat();
    return (__wbindgen_enum_GpuTextureFormat.indexOf(ret) + 1 || 96) - 1;
  };
  imports.wbg.__wbg_get_a045b61469322fcd = function (arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_gpu_1b22165b67dd5a59 = function (arg0) {
    const ret = arg0.gpu;
    return ret;
  };
  imports.wbg.__wbg_info_ed6e390d09c09062 = function (arg0) {
    console.info(arg0);
  };
  imports.wbg.__wbg_instanceof_GpuAdapter_331cc7dcda68de8c = function (arg0) {
    let result;
    try {
      result = arg0 instanceof GPUAdapter;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_GpuCanvasContext_4ea475a10f693c29 = function (
    arg0,
  ) {
    let result;
    try {
      result = arg0 instanceof GPUCanvasContext;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_HtmlCanvasElement_2a360ebbfd56909a = function (
    arg0,
  ) {
    let result;
    try {
      result = arg0 instanceof HTMLCanvasElement;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Window_7f29e5c72acbfd60 = function (arg0) {
    let result;
    try {
      result = arg0 instanceof Window;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_label_7045a786095b1bab = function (arg0, arg1) {
    const ret = arg1.label;
    const ptr1 = passStringToWasm0(
      ret,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_length_904c0910ed998bf3 = function (arg0) {
    const ret = arg0.length;
    return ret;
  };
  imports.wbg.__wbg_limits_6e5836ab03ee64b4 = function (arg0) {
    const ret = arg0.limits;
    return ret;
  };
  imports.wbg.__wbg_log_f3c04200b995730f = function (arg0) {
    console.log(arg0);
  };
  imports.wbg.__wbg_maxBindGroups_30d01da76ad53580 = function (arg0) {
    const ret = arg0.maxBindGroups;
    return ret;
  };
  imports.wbg.__wbg_maxBindingsPerBindGroup_3dcdeb4a7de67a4a = function (arg0) {
    const ret = arg0.maxBindingsPerBindGroup;
    return ret;
  };
  imports.wbg.__wbg_maxBufferSize_a3c3e79851bb49a7 = function (arg0) {
    const ret = arg0.maxBufferSize;
    return ret;
  };
  imports.wbg.__wbg_maxColorAttachmentBytesPerSample_61daf47ae1b88dc2 =
    function (arg0) {
      const ret = arg0.maxColorAttachmentBytesPerSample;
      return ret;
    };
  imports.wbg.__wbg_maxColorAttachments_f8f65390ed7c3dcd = function (arg0) {
    const ret = arg0.maxColorAttachments;
    return ret;
  };
  imports.wbg.__wbg_maxComputeInvocationsPerWorkgroup_dbfa932a2c3d9ca0 =
    function (arg0) {
      const ret = arg0.maxComputeInvocationsPerWorkgroup;
      return ret;
    };
  imports.wbg.__wbg_maxComputeWorkgroupSizeX_2a7fdde2d850eb69 = function (
    arg0,
  ) {
    const ret = arg0.maxComputeWorkgroupSizeX;
    return ret;
  };
  imports.wbg.__wbg_maxComputeWorkgroupSizeY_ae6eb3af592e045d = function (
    arg0,
  ) {
    const ret = arg0.maxComputeWorkgroupSizeY;
    return ret;
  };
  imports.wbg.__wbg_maxComputeWorkgroupSizeZ_df6389c6ad61aa20 = function (
    arg0,
  ) {
    const ret = arg0.maxComputeWorkgroupSizeZ;
    return ret;
  };
  imports.wbg.__wbg_maxComputeWorkgroupStorageSize_d090d78935189091 = function (
    arg0,
  ) {
    const ret = arg0.maxComputeWorkgroupStorageSize;
    return ret;
  };
  imports.wbg.__wbg_maxComputeWorkgroupsPerDimension_5d5d832c21854769 =
    function (arg0) {
      const ret = arg0.maxComputeWorkgroupsPerDimension;
      return ret;
    };
  imports.wbg.__wbg_maxDynamicStorageBuffersPerPipelineLayout_0d5102fd812fe086 =
    function (arg0) {
      const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
      return ret;
    };
  imports.wbg.__wbg_maxDynamicUniformBuffersPerPipelineLayout_fd6efab6fa18099a =
    function (arg0) {
      const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
      return ret;
    };
  imports.wbg.__wbg_maxSampledTexturesPerShaderStage_4ffa7a7339d366d7 =
    function (arg0) {
      const ret = arg0.maxSampledTexturesPerShaderStage;
      return ret;
    };
  imports.wbg.__wbg_maxSamplersPerShaderStage_776dbf5a1fdc58b1 = function (
    arg0,
  ) {
    const ret = arg0.maxSamplersPerShaderStage;
    return ret;
  };
  imports.wbg.__wbg_maxStorageBufferBindingSize_4a81009504bfcacd = function (
    arg0,
  ) {
    const ret = arg0.maxStorageBufferBindingSize;
    return ret;
  };
  imports.wbg.__wbg_maxStorageBuffersPerShaderStage_772149c39281f13c =
    function (arg0) {
      const ret = arg0.maxStorageBuffersPerShaderStage;
      return ret;
    };
  imports.wbg.__wbg_maxStorageTexturesPerShaderStage_181856fa7bd31bd2 =
    function (arg0) {
      const ret = arg0.maxStorageTexturesPerShaderStage;
      return ret;
    };
  imports.wbg.__wbg_maxTextureArrayLayers_c50110b7591a08e7 = function (arg0) {
    const ret = arg0.maxTextureArrayLayers;
    return ret;
  };
  imports.wbg.__wbg_maxTextureDimension1D_8886fff72f64818a = function (arg0) {
    const ret = arg0.maxTextureDimension1D;
    return ret;
  };
  imports.wbg.__wbg_maxTextureDimension2D_0e30b1b618696302 = function (arg0) {
    const ret = arg0.maxTextureDimension2D;
    return ret;
  };
  imports.wbg.__wbg_maxTextureDimension3D_2f567b561a18a953 = function (arg0) {
    const ret = arg0.maxTextureDimension3D;
    return ret;
  };
  imports.wbg.__wbg_maxUniformBufferBindingSize_50a7723e932bbd63 = function (
    arg0,
  ) {
    const ret = arg0.maxUniformBufferBindingSize;
    return ret;
  };
  imports.wbg.__wbg_maxUniformBuffersPerShaderStage_cfac0560ee2b33a2 =
    function (arg0) {
      const ret = arg0.maxUniformBuffersPerShaderStage;
      return ret;
    };
  imports.wbg.__wbg_maxVertexAttributes_6bd060b2025920cc = function (arg0) {
    const ret = arg0.maxVertexAttributes;
    return ret;
  };
  imports.wbg.__wbg_maxVertexBufferArrayStride_b3c77c1ff836be9f = function (
    arg0,
  ) {
    const ret = arg0.maxVertexBufferArrayStride;
    return ret;
  };
  imports.wbg.__wbg_maxVertexBuffers_b4635256105b2915 = function (arg0) {
    const ret = arg0.maxVertexBuffers;
    return ret;
  };
  imports.wbg.__wbg_minStorageBufferOffsetAlignment_989812b5a6a4b5e7 =
    function (arg0) {
      const ret = arg0.minStorageBufferOffsetAlignment;
      return ret;
    };
  imports.wbg.__wbg_minUniformBufferOffsetAlignment_ff7899c34a8303e7 =
    function (arg0) {
      const ret = arg0.minUniformBufferOffsetAlignment;
      return ret;
    };
  imports.wbg.__wbg_navigator_2de7a59c1ede3ea5 = function (arg0) {
    const ret = arg0.navigator;
    return ret;
  };
  imports.wbg.__wbg_navigator_b6d1cae68d750613 = function (arg0) {
    const ret = arg0.navigator;
    return ret;
  };
  imports.wbg.__wbg_new_1930cbb8d9ffc31b = function () {
    const ret = new Object();
    return ret;
  };
  imports.wbg.__wbg_new_8a6f238a6ece86ea = function () {
    const ret = new Error();
    return ret;
  };
  imports.wbg.__wbg_new_d5e3800b120e37e1 = function (arg0, arg1) {
    try {
      var state0 = { a: arg0, b: arg1 };
      var cb0 = (arg0, arg1) => {
        const a = state0.a;
        state0.a = 0;
        try {
          return __wbg_adapter_491(a, state0.b, arg0, arg1);
        } finally {
          state0.a = a;
        }
      };
      const ret = new Promise(cb0);
      return ret;
    } finally {
      state0.a = state0.b = 0;
    }
  };
  imports.wbg.__wbg_new_e969dc3f68d25093 = function () {
    const ret = [];
    return ret;
  };
  imports.wbg.__wbg_newfromslice_d0d56929c6d9c842 = function (arg0, arg1) {
    const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
    return ret;
  };
  imports.wbg.__wbg_newnoargs_a81330f6e05d8aca = function (arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return ret;
  };
  imports.wbg.__wbg_newwithbyteoffsetandlength_9aade108cd45cf37 = function (
    arg0,
    arg1,
    arg2,
  ) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
  };
  imports.wbg.__wbg_prototypesetcall_c5f74efd31aea86b = function (
    arg0,
    arg1,
    arg2,
  ) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
  };
  imports.wbg.__wbg_push_cd3ac7d5b094565d = function (arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
  };
  imports.wbg.__wbg_querySelectorAll_96f9a7d98faf7ae8 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = arg0.querySelectorAll(getStringFromWasm0(arg1, arg2));
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_queueMicrotask_bcc6e26d899696db = function (arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
  };
  imports.wbg.__wbg_queueMicrotask_f24a794d09c42640 = function (arg0) {
    queueMicrotask(arg0);
  };
  imports.wbg.__wbg_queue_0ffbb97537a0c4ed = function (arg0) {
    const ret = arg0.queue;
    return ret;
  };
  imports.wbg.__wbg_requestAdapter_f09d28b3f37de26c = function (arg0, arg1) {
    const ret = arg0.requestAdapter(arg1);
    return ret;
  };
  imports.wbg.__wbg_requestDevice_51509dadc50b2e9d = function (arg0, arg1) {
    const ret = arg0.requestDevice(arg1);
    return ret;
  };
  imports.wbg.__wbg_resolve_5775c0ef9222f556 = function (arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
  };
  imports.wbg.__wbg_setBindGroup_a81ce7b3934585bf = function (
    arg0,
    arg1,
    arg2,
  ) {
    arg0.setBindGroup(arg1 >>> 0, arg2);
  };
  imports.wbg.__wbg_setBindGroup_bb0c2c05b7c49401 = function () {
    return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
      arg0.setBindGroup(
        arg1 >>> 0,
        arg2,
        getArrayU32FromWasm0(arg3, arg4),
        arg5,
        arg6 >>> 0,
      );
    }, arguments);
  };
  imports.wbg.__wbg_setPipeline_78f8f6d440dddd25 = function (arg0, arg1) {
    arg0.setPipeline(arg1);
  };
  imports.wbg.__wbg_setVertexBuffer_b0d3128a04bfd766 = function (
    arg0,
    arg1,
    arg2,
    arg3,
    arg4,
  ) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3, arg4);
  };
  imports.wbg.__wbg_setVertexBuffer_edbff6ddb5055174 = function (
    arg0,
    arg1,
    arg2,
    arg3,
  ) {
    arg0.setVertexBuffer(arg1 >>> 0, arg2, arg3);
  };
  imports.wbg.__wbg_set_4773e1239e576d8d = function (arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
  };
  imports.wbg.__wbg_set_b33e7a98099eed58 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = Reflect.set(arg0, arg1, arg2);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_seta_721deab95e136b71 = function (arg0, arg1) {
    arg0.a = arg1;
  };
  imports.wbg.__wbg_setaccess_b20bfa3ec6b65d05 = function (arg0, arg1) {
    arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
  };
  imports.wbg.__wbg_setalpha_2c7bdc9da833b6c2 = function (arg0, arg1) {
    arg0.alpha = arg1;
  };
  imports.wbg.__wbg_setalphamode_fc3528d234b1fefa = function (arg0, arg1) {
    arg0.alphaMode = __wbindgen_enum_GpuCanvasAlphaMode[arg1];
  };
  imports.wbg.__wbg_setalphatocoverageenabled_314ce1ca1759b395 = function (
    arg0,
    arg1,
  ) {
    arg0.alphaToCoverageEnabled = arg1 !== 0;
  };
  imports.wbg.__wbg_setarraylayercount_3c7942d623042874 = function (
    arg0,
    arg1,
  ) {
    arg0.arrayLayerCount = arg1 >>> 0;
  };
  imports.wbg.__wbg_setarraystride_4b36d0822dea74a8 = function (arg0, arg1) {
    arg0.arrayStride = arg1;
  };
  imports.wbg.__wbg_setaspect_f06e234d0aacd1a6 = function (arg0, arg1) {
    arg0.aspect = __wbindgen_enum_GpuTextureAspect[arg1];
  };
  imports.wbg.__wbg_setattributes_382cc084e6792c33 = function (arg0, arg1) {
    arg0.attributes = arg1;
  };
  imports.wbg.__wbg_setb_f53c2f10173c804f = function (arg0, arg1) {
    arg0.b = arg1;
  };
  imports.wbg.__wbg_setbasearraylayer_a5b968338c5c56b6 = function (arg0, arg1) {
    arg0.baseArrayLayer = arg1 >>> 0;
  };
  imports.wbg.__wbg_setbasemiplevel_e3288c2d851da708 = function (arg0, arg1) {
    arg0.baseMipLevel = arg1 >>> 0;
  };
  imports.wbg.__wbg_setbeginningofpasswriteindex_35dcbf135e4f9d61 = function (
    arg0,
    arg1,
  ) {
    arg0.beginningOfPassWriteIndex = arg1 >>> 0;
  };
  imports.wbg.__wbg_setbindgrouplayouts_8de6e109dd34a448 = function (
    arg0,
    arg1,
  ) {
    arg0.bindGroupLayouts = arg1;
  };
  imports.wbg.__wbg_setbinding_5276d6202fceba46 = function (arg0, arg1) {
    arg0.binding = arg1 >>> 0;
  };
  imports.wbg.__wbg_setbinding_9e9ed8b6e1418176 = function (arg0, arg1) {
    arg0.binding = arg1 >>> 0;
  };
  imports.wbg.__wbg_setblend_6828ff186670f414 = function (arg0, arg1) {
    arg0.blend = arg1;
  };
  imports.wbg.__wbg_setbuffer_1acdac44d9638973 = function (arg0, arg1) {
    arg0.buffer = arg1;
  };
  imports.wbg.__wbg_setbuffer_74b7b0adf855cf1a = function (arg0, arg1) {
    arg0.buffer = arg1;
  };
  imports.wbg.__wbg_setbuffers_53e83b7c7a5c95aa = function (arg0, arg1) {
    arg0.buffers = arg1;
  };
  imports.wbg.__wbg_setclearvalue_f82fff01ed0b5c35 = function (arg0, arg1) {
    arg0.clearValue = arg1;
  };
  imports.wbg.__wbg_setcode_6b6ad02fc1705aa2 = function (arg0, arg1, arg2) {
    arg0.code = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setcolor_0df2c5f47a951ac1 = function (arg0, arg1) {
    arg0.color = arg1;
  };
  imports.wbg.__wbg_setcolorattachments_de625dd9a4850a13 = function (
    arg0,
    arg1,
  ) {
    arg0.colorAttachments = arg1;
  };
  imports.wbg.__wbg_setcompare_8fbddcdd4781f49a = function (arg0, arg1) {
    arg0.compare = __wbindgen_enum_GpuCompareFunction[arg1];
  };
  imports.wbg.__wbg_setcount_e8b681b1185cf5da = function (arg0, arg1) {
    arg0.count = arg1 >>> 0;
  };
  imports.wbg.__wbg_setcullmode_74bc6eaab528c94b = function (arg0, arg1) {
    arg0.cullMode = __wbindgen_enum_GpuCullMode[arg1];
  };
  imports.wbg.__wbg_setdepthbias_cdcc35c6971d19cd = function (arg0, arg1) {
    arg0.depthBias = arg1;
  };
  imports.wbg.__wbg_setdepthbiasclamp_57801e26f66496d9 = function (arg0, arg1) {
    arg0.depthBiasClamp = arg1;
  };
  imports.wbg.__wbg_setdepthbiasslopescale_81699f807bd5a647 = function (
    arg0,
    arg1,
  ) {
    arg0.depthBiasSlopeScale = arg1;
  };
  imports.wbg.__wbg_setdepthclearvalue_9801aa9eff7645df = function (
    arg0,
    arg1,
  ) {
    arg0.depthClearValue = arg1;
  };
  imports.wbg.__wbg_setdepthcompare_53d249a136855bd8 = function (arg0, arg1) {
    arg0.depthCompare = __wbindgen_enum_GpuCompareFunction[arg1];
  };
  imports.wbg.__wbg_setdepthfailop_2e4767995acd4c0a = function (arg0, arg1) {
    arg0.depthFailOp = __wbindgen_enum_GpuStencilOperation[arg1];
  };
  imports.wbg.__wbg_setdepthloadop_af0b0f05e83f6571 = function (arg0, arg1) {
    arg0.depthLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
  };
  imports.wbg.__wbg_setdepthorarraylayers_5d480fc05509ea0c = function (
    arg0,
    arg1,
  ) {
    arg0.depthOrArrayLayers = arg1 >>> 0;
  };
  imports.wbg.__wbg_setdepthreadonly_a7b7224074e024d3 = function (arg0, arg1) {
    arg0.depthReadOnly = arg1 !== 0;
  };
  imports.wbg.__wbg_setdepthstencil_2bb2fcea55783858 = function (arg0, arg1) {
    arg0.depthStencil = arg1;
  };
  imports.wbg.__wbg_setdepthstencilattachment_dcbd5b74e4350e16 = function (
    arg0,
    arg1,
  ) {
    arg0.depthStencilAttachment = arg1;
  };
  imports.wbg.__wbg_setdepthstoreop_40dfd99c7e42f894 = function (arg0, arg1) {
    arg0.depthStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
  };
  imports.wbg.__wbg_setdepthwriteenabled_4368a2fe5d258cb0 = function (
    arg0,
    arg1,
  ) {
    arg0.depthWriteEnabled = arg1 !== 0;
  };
  imports.wbg.__wbg_setdevice_d372d6aa06f20cae = function (arg0, arg1) {
    arg0.device = arg1;
  };
  imports.wbg.__wbg_setdimension_268b2b7bfc3e2bb8 = function (arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureDimension[arg1];
  };
  imports.wbg.__wbg_setdimension_359b229ea1b67a77 = function (arg0, arg1) {
    arg0.dimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
  };
  imports.wbg.__wbg_setdstfactor_96e73b9eaedeb23e = function (arg0, arg1) {
    arg0.dstFactor = __wbindgen_enum_GpuBlendFactor[arg1];
  };
  imports.wbg.__wbg_setendofpasswriteindex_71e7659a9d2a9d60 = function (
    arg0,
    arg1,
  ) {
    arg0.endOfPassWriteIndex = arg1 >>> 0;
  };
  imports.wbg.__wbg_setentries_5941f16619f54d42 = function (arg0, arg1) {
    arg0.entries = arg1;
  };
  imports.wbg.__wbg_setentries_97a6ad10aa7fa4d1 = function (arg0, arg1) {
    arg0.entries = arg1;
  };
  imports.wbg.__wbg_setentrypoint_a858879f63ec2236 = function (
    arg0,
    arg1,
    arg2,
  ) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setentrypoint_a8ce0b22c20548b0 = function (
    arg0,
    arg1,
    arg2,
  ) {
    arg0.entryPoint = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setfailop_d55bda42958efa98 = function (arg0, arg1) {
    arg0.failOp = __wbindgen_enum_GpuStencilOperation[arg1];
  };
  imports.wbg.__wbg_setformat_69ba449c0e080708 = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
  };
  imports.wbg.__wbg_setformat_713b9e90b13df6aa = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuVertexFormat[arg1];
  };
  imports.wbg.__wbg_setformat_76bcf93126fcdc9d = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
  };
  imports.wbg.__wbg_setformat_970299d3f84a8f20 = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
  };
  imports.wbg.__wbg_setformat_a8a60feb127f0971 = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
  };
  imports.wbg.__wbg_setformat_beb33029aea4cf8e = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
  };
  imports.wbg.__wbg_setformat_f6ec428901712514 = function (arg0, arg1) {
    arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
  };
  imports.wbg.__wbg_setfragment_0f23dfb67b3e84ab = function (arg0, arg1) {
    arg0.fragment = arg1;
  };
  imports.wbg.__wbg_setfrontface_c80337acd997f8c6 = function (arg0, arg1) {
    arg0.frontFace = __wbindgen_enum_GpuFrontFace[arg1];
  };
  imports.wbg.__wbg_setg_7eb6b5e67456a09e = function (arg0, arg1) {
    arg0.g = arg1;
  };
  imports.wbg.__wbg_sethasdynamicoffset_b34dfdba692a7959 = function (
    arg0,
    arg1,
  ) {
    arg0.hasDynamicOffset = arg1 !== 0;
  };
  imports.wbg.__wbg_setheight_0d520c9bbeafaa6d = function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
  };
  imports.wbg.__wbg_setheight_189a74bc2b050c47 = function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
  };
  imports.wbg.__wbg_setheight_a7439239ff109215 = function (arg0, arg1) {
    arg0.height = arg1 >>> 0;
  };
  imports.wbg.__wbg_setlabel_1df8805b2aad72d7 = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_460a52030d604dd7 = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_57008c2e11276b5e = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_68cd87490e02e1de = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_76b058f0224eb49e = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_89c327fa94d8076b = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_969d6f8279c74456 = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_a0c41069e355431e = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_c14214ffbf6e5c4a = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_ca2c132e2b646244 = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_e6fab993e10f1dd3 = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlabel_f9a45e9ef445b781 = function (arg0, arg1, arg2) {
    arg0.label = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_setlayout_67a29edc6247c437 = function (arg0, arg1) {
    arg0.layout = arg1;
  };
  imports.wbg.__wbg_setlayout_758d30edbd6ea91c = function (arg0, arg1) {
    arg0.layout = arg1;
  };
  imports.wbg.__wbg_setloadop_5644a3bf70f4f76c = function (arg0, arg1) {
    arg0.loadOp = __wbindgen_enum_GpuLoadOp[arg1];
  };
  imports.wbg.__wbg_setmappedatcreation_0dc5796d4e90ab4b = function (
    arg0,
    arg1,
  ) {
    arg0.mappedAtCreation = arg1 !== 0;
  };
  imports.wbg.__wbg_setmask_800b15ad78613be8 = function (arg0, arg1) {
    arg0.mask = arg1 >>> 0;
  };
  imports.wbg.__wbg_setminbindingsize_20ca594cd6d93818 = function (arg0, arg1) {
    arg0.minBindingSize = arg1;
  };
  imports.wbg.__wbg_setmiplevelcount_5e59806cbcf116e9 = function (arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
  };
  imports.wbg.__wbg_setmiplevelcount_f896fe8cbb669df2 = function (arg0, arg1) {
    arg0.mipLevelCount = arg1 >>> 0;
  };
  imports.wbg.__wbg_setmodule_4c73bb35cb0beb0b = function (arg0, arg1) {
    arg0.module = arg1;
  };
  imports.wbg.__wbg_setmodule_ca21130b3f66ea5d = function (arg0, arg1) {
    arg0.module = arg1;
  };
  imports.wbg.__wbg_setmultisample_4f57dcaa4144a62f = function (arg0, arg1) {
    arg0.multisample = arg1;
  };
  imports.wbg.__wbg_setmultisampled_0bb9fc1b577bf11a = function (arg0, arg1) {
    arg0.multisampled = arg1 !== 0;
  };
  imports.wbg.__wbg_setoffset_a8194a4fcfff8910 = function (arg0, arg1) {
    arg0.offset = arg1;
  };
  imports.wbg.__wbg_setoffset_d37e5fa34e9ded2e = function (arg0, arg1) {
    arg0.offset = arg1;
  };
  imports.wbg.__wbg_setoperation_173958551af7f4f2 = function (arg0, arg1) {
    arg0.operation = __wbindgen_enum_GpuBlendOperation[arg1];
  };
  imports.wbg.__wbg_setpassop_070547fd6160a00d = function (arg0, arg1) {
    arg0.passOp = __wbindgen_enum_GpuStencilOperation[arg1];
  };
  imports.wbg.__wbg_setpowerpreference_1f3351e5d2acf765 = function (
    arg0,
    arg1,
  ) {
    arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
  };
  imports.wbg.__wbg_setprimitive_ee18492ab93953bc = function (arg0, arg1) {
    arg0.primitive = arg1;
  };
  imports.wbg.__wbg_setqueryset_3b14f95f9bd114db = function (arg0, arg1) {
    arg0.querySet = arg1;
  };
  imports.wbg.__wbg_setr_a4e2f60e3466da86 = function (arg0, arg1) {
    arg0.r = arg1;
  };
  imports.wbg.__wbg_setrequiredfeatures_fc44bc3433300ee3 = function (
    arg0,
    arg1,
  ) {
    arg0.requiredFeatures = arg1;
  };
  imports.wbg.__wbg_setresolvetarget_c4b519cab7eb42b7 = function (arg0, arg1) {
    arg0.resolveTarget = arg1;
  };
  imports.wbg.__wbg_setresource_1659f5a29a2e0541 = function (arg0, arg1) {
    arg0.resource = arg1;
  };
  imports.wbg.__wbg_setsamplecount_e88d044f067a2241 = function (arg0, arg1) {
    arg0.sampleCount = arg1 >>> 0;
  };
  imports.wbg.__wbg_setsampler_a778272f31d31ce5 = function (arg0, arg1) {
    arg0.sampler = arg1;
  };
  imports.wbg.__wbg_setsampletype_c0e25b966db74174 = function (arg0, arg1) {
    arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
  };
  imports.wbg.__wbg_setshaderlocation_985046f48e76573f = function (arg0, arg1) {
    arg0.shaderLocation = arg1 >>> 0;
  };
  imports.wbg.__wbg_setsize_23676383c9c0732f = function (arg0, arg1) {
    arg0.size = arg1;
  };
  imports.wbg.__wbg_setsize_51616eaf8209c58b = function (arg0, arg1) {
    arg0.size = arg1;
  };
  imports.wbg.__wbg_setsize_5878aadcd23673cf = function (arg0, arg1) {
    arg0.size = arg1;
  };
  imports.wbg.__wbg_setsrcfactor_04ce8874f1bff5a8 = function (arg0, arg1) {
    arg0.srcFactor = __wbindgen_enum_GpuBlendFactor[arg1];
  };
  imports.wbg.__wbg_setstencilback_4b20ecfcd4c4816a = function (arg0, arg1) {
    arg0.stencilBack = arg1;
  };
  imports.wbg.__wbg_setstencilclearvalue_7ba82e1993788f37 = function (
    arg0,
    arg1,
  ) {
    arg0.stencilClearValue = arg1 >>> 0;
  };
  imports.wbg.__wbg_setstencilfront_1ca3b695f7c42f6a = function (arg0, arg1) {
    arg0.stencilFront = arg1;
  };
  imports.wbg.__wbg_setstencilloadop_b65c60a0077315cd = function (arg0, arg1) {
    arg0.stencilLoadOp = __wbindgen_enum_GpuLoadOp[arg1];
  };
  imports.wbg.__wbg_setstencilreadmask_4f5b98747141e796 = function (
    arg0,
    arg1,
  ) {
    arg0.stencilReadMask = arg1 >>> 0;
  };
  imports.wbg.__wbg_setstencilreadonly_9006a99a91d198e9 = function (
    arg0,
    arg1,
  ) {
    arg0.stencilReadOnly = arg1 !== 0;
  };
  imports.wbg.__wbg_setstencilstoreop_4f00c5eca345c145 = function (arg0, arg1) {
    arg0.stencilStoreOp = __wbindgen_enum_GpuStoreOp[arg1];
  };
  imports.wbg.__wbg_setstencilwritemask_e37a7214d84ace99 = function (
    arg0,
    arg1,
  ) {
    arg0.stencilWriteMask = arg1 >>> 0;
  };
  imports.wbg.__wbg_setstepmode_7d58d75e6547a7a6 = function (arg0, arg1) {
    arg0.stepMode = __wbindgen_enum_GpuVertexStepMode[arg1];
  };
  imports.wbg.__wbg_setstoragetexture_2987339fec972d54 = function (arg0, arg1) {
    arg0.storageTexture = arg1;
  };
  imports.wbg.__wbg_setstoreop_c62dd050b5806095 = function (arg0, arg1) {
    arg0.storeOp = __wbindgen_enum_GpuStoreOp[arg1];
  };
  imports.wbg.__wbg_setstripindexformat_3e4893749b3f00b0 = function (
    arg0,
    arg1,
  ) {
    arg0.stripIndexFormat = __wbindgen_enum_GpuIndexFormat[arg1];
  };
  imports.wbg.__wbg_settargets_0ef1de33af7253a6 = function (arg0, arg1) {
    arg0.targets = arg1;
  };
  imports.wbg.__wbg_settexture_f62859f817324dd1 = function (arg0, arg1) {
    arg0.texture = arg1;
  };
  imports.wbg.__wbg_settimestampwrites_1995524c3a31cb8f = function (
    arg0,
    arg1,
  ) {
    arg0.timestampWrites = arg1;
  };
  imports.wbg.__wbg_settopology_3d9b2f0ffe2e350c = function (arg0, arg1) {
    arg0.topology = __wbindgen_enum_GpuPrimitiveTopology[arg1];
  };
  imports.wbg.__wbg_settype_0b59dd5f4721c490 = function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
  };
  imports.wbg.__wbg_settype_8c8bbfab4cf7e32e = function (arg0, arg1) {
    arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
  };
  imports.wbg.__wbg_setusage_44ebc3b496e60ff4 = function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
  };
  imports.wbg.__wbg_setusage_4cf7b16df5617a46 = function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
  };
  imports.wbg.__wbg_setusage_c45cca4a5b9f8376 = function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
  };
  imports.wbg.__wbg_setusage_e58b3c3ce83fbbda = function (arg0, arg1) {
    arg0.usage = arg1 >>> 0;
  };
  imports.wbg.__wbg_setvertex_6144c56d98e2314a = function (arg0, arg1) {
    arg0.vertex = arg1;
  };
  imports.wbg.__wbg_setview_4bc3dfcbfc8a58ba = function (arg0, arg1) {
    arg0.view = arg1;
  };
  imports.wbg.__wbg_setview_8d0b0055b6ef07e3 = function (arg0, arg1) {
    arg0.view = arg1;
  };
  imports.wbg.__wbg_setviewdimension_afac48443b8fb565 = function (arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
  };
  imports.wbg.__wbg_setviewdimension_f5d4b5336a27d302 = function (arg0, arg1) {
    arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
  };
  imports.wbg.__wbg_setviewformats_0cfe174ac882efaf = function (arg0, arg1) {
    arg0.viewFormats = arg1;
  };
  imports.wbg.__wbg_setviewformats_c566feb1da7b1925 = function (arg0, arg1) {
    arg0.viewFormats = arg1;
  };
  imports.wbg.__wbg_setvisibility_7245f1acbedb4ff4 = function (arg0, arg1) {
    arg0.visibility = arg1 >>> 0;
  };
  imports.wbg.__wbg_setwidth_056381a7176ba440 = function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
  };
  imports.wbg.__wbg_setwidth_c0cc5e9bbf4c565b = function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
  };
  imports.wbg.__wbg_setwidth_c5360761afaf1c57 = function (arg0, arg1) {
    arg0.width = arg1 >>> 0;
  };
  imports.wbg.__wbg_setwritemask_c381ff702509999c = function (arg0, arg1) {
    arg0.writeMask = arg1 >>> 0;
  };
  imports.wbg.__wbg_stack_0ed75d68575b0f3c = function (arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(
      ret,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_static_accessor_GLOBAL_1f13249cc3acc96d = function () {
    const ret = typeof global === "undefined" ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_static_accessor_GLOBAL_THIS_df7ae94b1e0ed6a3 = function () {
    const ret = typeof globalThis === "undefined" ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_static_accessor_SELF_6265471db3b3c228 = function () {
    const ret = typeof self === "undefined" ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_static_accessor_WINDOW_16fb482f8ec52863 = function () {
    const ret = typeof window === "undefined" ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_submit_252766c4e0945cee = function (arg0, arg1) {
    arg0.submit(arg1);
  };
  imports.wbg.__wbg_then_8d2fcccde5380a03 = function (arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
  };
  imports.wbg.__wbg_then_9cc266be2bf537b6 = function (arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
  };
  imports.wbg.__wbg_unmap_7b299155f31a9d79 = function (arg0) {
    arg0.unmap();
  };
  imports.wbg.__wbg_warn_07ef1f61c52799fb = function (arg0) {
    console.warn(arg0);
  };
  imports.wbg.__wbg_wbindgencbdrop_a85ed476c6a370b9 = function (arg0) {
    const obj = arg0.original;
    if (obj.cnt-- == 1) {
      obj.a = 0;
      return true;
    }
    const ret = false;
    return ret;
  };
  imports.wbg.__wbg_wbindgendebugstring_bb652b1bc2061b6d = function (
    arg0,
    arg1,
  ) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(
      ret,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_wbindgenisfunction_ea72b9d66a0e1705 = function (arg0) {
    const ret = typeof arg0 === "function";
    return ret;
  };
  imports.wbg.__wbg_wbindgenisnull_e1388bbe88158c3f = function (arg0) {
    const ret = arg0 === null;
    return ret;
  };
  imports.wbg.__wbg_wbindgenisundefined_71f08a6ade4354e7 = function (arg0) {
    const ret = arg0 === undefined;
    return ret;
  };
  imports.wbg.__wbg_wbindgenthrow_4c11a24fca429ccf = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbg_writeBuffer_3193eaacefdcf39a = function () {
    return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
      arg0.writeBuffer(arg1, arg2, arg3, arg4, arg5);
    }, arguments);
  };
  imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function (arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
  };
  imports.wbg.__wbindgen_cast_9802243c858d266f = function (arg0, arg1) {
    // Cast intrinsic for `Closure(Closure { dtor_idx: 71, function: Function { arguments: [Externref], shim_idx: 72, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
    const ret = makeMutClosure(arg0, arg1, 71, __wbg_adapter_6);
    return ret;
  };
  imports.wbg.__wbindgen_cast_cb9088102bce6b30 = function (arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
    const ret = getArrayU8FromWasm0(arg0, arg1);
    return ret;
  };
  imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function (arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return ret;
  };
  imports.wbg.__wbindgen_init_externref_table = function () {
    const table = wasm.__wbindgen_export_2;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
  };

  return imports;
}

function __wbg_init_memory(imports, memory) {}

function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedDataViewMemory0 = null;
  cachedUint32ArrayMemory0 = null;
  cachedUint8ArrayMemory0 = null;

  wasm.__wbindgen_start();
  return wasm;
}

function initSync(module) {
  if (wasm !== undefined) return wasm;

  if (typeof module !== "undefined") {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn(
        "using deprecated parameters for `initSync()`; pass a single object instead",
      );
    }
  }

  const imports = __wbg_get_imports();

  __wbg_init_memory(imports);

  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }

  const instance = new WebAssembly.Instance(module, imports);

  return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;

  if (typeof module_or_path !== "undefined") {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        "using deprecated parameters for the initialization function; pass a single object instead",
      );
    }
  }

  if (typeof module_or_path === "undefined") {
    module_or_path = new URL("wasm_wgpu_demo_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();

  if (
    typeof module_or_path === "string" ||
    (typeof Request === "function" && module_or_path instanceof Request) ||
    (typeof URL === "function" && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  __wbg_init_memory(imports);

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
