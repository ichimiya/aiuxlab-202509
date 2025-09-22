/* @vitest-environment jsdom */

import { renderHook, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useAppWindowVisibility } from "./useAppWindowVisibility";
import { useAppWindowLayoutStore } from "@/features/voiceRecognition/stores/appWindowLayoutStore";

describe("useAppWindowVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppWindowLayoutStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態ではコンテンツを表示し、サイズ変更中は非表示にする", () => {
    const { result } = renderHook(() => useAppWindowVisibility());

    expect(result.current.isHidden).toBe(false);

    act(() => {
      useAppWindowLayoutStore.getState().setPhase("optimizing");
    });

    expect(result.current.isHidden).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isHidden).toBe(false);
  });

  it("音声認識のトランジション中はコンテンツを非表示にする", () => {
    const { result } = renderHook(() => useAppWindowVisibility());

    act(() => {
      useAppWindowLayoutStore.getState().setTransitioning(true);
    });

    expect(result.current.isHidden).toBe(true);

    act(() => {
      useAppWindowLayoutStore.getState().setTransitioning(false);
    });

    expect(result.current.isHidden).toBe(false);
  });

  it("トランジション中にリサイズが完了しても、移行中は非表示のまま維持する", () => {
    const { result } = renderHook(() => useAppWindowVisibility());

    act(() => {
      const store = useAppWindowLayoutStore.getState();
      store.setTransitioning(true);
      store.setPhase("optimizing");
    });

    expect(result.current.isHidden).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isHidden).toBe(true);

    act(() => {
      useAppWindowLayoutStore.getState().setTransitioning(false);
    });

    expect(result.current.isHidden).toBe(false);
  });
});
