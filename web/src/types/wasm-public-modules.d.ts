declare module "/wasm/wasm_wgpu_demo.js" {
  export default function init(): Promise<void>;
  export function start_graph(canvasId: string): Promise<void> | void;
  export function frame_graph(time: number): void;
  export function resize_graph(width: number, height: number): void;
  export function set_graph_params(
    edgeThickness: number,
    nodeSize: number,
    flowSpeed: number,
  ): void;
  export function set_graph3d_params(rotateSpeed: number): void;
  export function set_graph3d_fog(
    start: number,
    end: number,
    intensity: number,
  ): void;
  export function set_graph3d_allpairs(enabled: boolean): void;
  export function set_graph3d_link_fade(start: number, end: number): void;
  export function set_graph3d_shell_profile(profile: number): void;
  export function set_graph3d_nucleus(enabled: boolean): void;
  export const set_graph3d_nucleus_fade:
    | ((start: number, end: number) => void)
    | undefined;
}
