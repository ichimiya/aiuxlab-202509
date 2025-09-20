"use client";

import { useEffect, useRef } from "react";

const CANVAS_ID = "wasm-network-background";

const DEFAULT_PARAMS = {
  edgeThickness: 0.006,
  nodeSize: 0.08,
  flowSpeed: 1.0,
  rotateSpeed: 0.04,
  fogStart: 0.55,
  fogEnd: 0.95,
  fogIntensity: 0.8,
  linkFadeStart: 0.8,
  linkFadeEnd: 1.4,
  nucleusFadeStart: 0.3,
  nucleusFadeEnd: 2.0,
};

interface GraphModule {
  default: () => Promise<void>;
  start_graph: (canvasId: string) => Promise<void> | void;
  frame_graph: (time: number) => void;
  resize_graph: (width: number, height: number) => void;
  set_graph_params: (
    edgeThickness: number,
    nodeSize: number,
    flowSpeed: number,
  ) => void;
  set_graph3d_params: (rotateSpeed: number) => void;
  set_graph3d_fog: (start: number, end: number, intensity: number) => void;
  set_graph3d_allpairs: (enabled: boolean) => void;
  set_graph3d_link_fade: (start: number, end: number) => void;
  set_graph3d_shell_profile: (profile: number) => void;
  set_graph3d_nucleus: (enabled: boolean) => void;
  set_graph3d_nucleus_fade?: (start: number, end: number) => void;
}

export function WasmBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    const bootstrap = async () => {
      if (!("gpu" in navigator)) {
        console.warn(
          "WebGPU is not available in this browser. Falling back without WASM background.",
        );
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      try {
        const wasmModulePath = "/wasm/wasm_wgpu_demo.js";
        const wasm = (await import(
          /* webpackIgnore: true */ wasmModulePath
        )) as GraphModule;
        await wasm.default();

        canvas.id = CANVAS_ID;
        canvas.style.backgroundColor = "transparent";
        canvas.style.mixBlendMode = "screen";
        await wasm.start_graph(CANVAS_ID);

        // Apply baseline parameters aligned with wasm/web/network3d.html defaults.
        wasm.set_graph_params(
          DEFAULT_PARAMS.edgeThickness,
          DEFAULT_PARAMS.nodeSize,
          DEFAULT_PARAMS.flowSpeed,
        );
        wasm.set_graph3d_params(DEFAULT_PARAMS.rotateSpeed);
        wasm.set_graph3d_fog(
          DEFAULT_PARAMS.fogStart,
          DEFAULT_PARAMS.fogEnd,
          DEFAULT_PARAMS.fogIntensity,
        );
        wasm.set_graph3d_nucleus(false);
        wasm.set_graph3d_allpairs(false);
        wasm.set_graph3d_link_fade(
          DEFAULT_PARAMS.linkFadeStart,
          DEFAULT_PARAMS.linkFadeEnd,
        );
        wasm.set_graph3d_shell_profile(0);
        if (wasm.set_graph3d_nucleus_fade) {
          wasm.set_graph3d_nucleus_fade(
            DEFAULT_PARAMS.nucleusFadeStart,
            DEFAULT_PARAMS.nucleusFadeEnd,
          );
        } else {
          wasm.set_graph3d_link_fade(
            DEFAULT_PARAMS.nucleusFadeStart,
            DEFAULT_PARAMS.nucleusFadeEnd,
          );
        }

        const updateSize = () => {
          const canvasEl = canvasRef.current;
          if (!canvasEl) {
            return;
          }
          const parent = canvasEl.parentElement;
          if (!parent) {
            return;
          }
          const { width, height } = parent.getBoundingClientRect();
          const nextWidth = Math.max(1, Math.floor(width));
          const nextHeight = Math.max(1, Math.floor(height));
          if (canvasEl.width !== nextWidth || canvasEl.height !== nextHeight) {
            canvasEl.width = nextWidth;
            canvasEl.height = nextHeight;
            wasm.resize_graph(nextWidth, nextHeight);
          }
        };

        updateSize();
        resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(canvas);

        const frame = (time: number) => {
          if (cancelled) {
            return;
          }
          wasm.frame_graph(time);
          rafId = requestAnimationFrame(frame);
        };
        rafId = requestAnimationFrame(frame);
      } catch (error) {
        console.error("Failed to initialise WASM background", error);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (resizeObserver && canvasRef.current) {
        resizeObserver.unobserve(canvasRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
    />
  );
}
