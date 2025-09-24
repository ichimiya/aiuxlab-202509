/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelectionInsights } from "./useSelectionInsights";
import { useResearchStore } from "@/shared/stores/researchStore";

declare global {
  var __setMockResearchSnapshots: (snapshots: Record<string, unknown>) => void;
}

vi.mock("@/shared/stores/researchDetailStore", () => {
  const storeState = {
    snapshots: {} as Record<string, unknown>,
    connections: {},
  };

  (globalThis as any).__setMockResearchSnapshots = (
    snapshots: Record<string, unknown>,
  ) => {
    storeState.snapshots = snapshots;
  };

  return {
    useResearchDetailStore: (selector: (state: typeof storeState) => any) =>
      selector(storeState),
  };
});

const fetchMock = vi.fn();

describe("useSelectionInsights", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(global, "fetch").mockImplementation(fetchMock as any);
    useResearchStore.getState().reset();
    fetchMock.mockReset();
    globalThis.__setMockResearchSnapshots?.({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("選択テキストを1秒後に送信し、結果をステートに保持する", async () => {
    globalThis.__setMockResearchSnapshots?.({
      "research-1": {
        query: "AI エージェント市場の主要プレイヤー",
      },
    });

    const selection = {
      text: "AIリスクの分類",
      context: "AIリスクの分類と優先度",
      origin: {
        nodeId: "paragraph-growth",
        resultId: "result-001",
      },
      section: {
        heading: "市場規模と成長率",
        summary:
          "市場規模と成長率: 2024年以降、生成AIスタートアップ投資が再加速",
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          summary: "AIリスクは運用・倫理・法規制の3分類",
          insights: [
            {
              id: "topic-1",
              title: "運用ガバナンスのチェックポイント",
              summary: "運用フェーズでの統制が主要リスク",
              keyPoints: [
                {
                  label: "監査の自動化",
                  detail: "継続的なモデル評価が求められる",
                },
              ],
              recommendedSources: [],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useSelectionInsights("research-1"));

    act(() => {
      const { setTextSelection } = useResearchStore.getState();
      setTextSelection(selection as any);
    });

    expect(result.current.status).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/research/research-1/selection-insights",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.selection.origin.nodeId).toBe("paragraph-growth");
    expect(body.selection.section.heading).toBe("市場規模と成長率");
    expect(body.researchQuery).toBe("AI エージェント市場の主要プレイヤー");
    expect(result.current.status).toBe("loaded");
    expect(result.current.data?.summary).toBe(
      "AIリスクは運用・倫理・法規制の3分類",
    );
    expect(result.current.data?.insights).toHaveLength(1);
    expect(result.current.data?.insights[0]?.title).toBe(
      "運用ガバナンスのチェックポイント",
    );
  });

  it("選択解除後も直前の結果を保持する", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          summary: "追加知見",
          insights: [
            {
              id: "topic-1",
              title: "Follow-up",
              summary: "詳細",
              keyPoints: [],
              recommendedSources: [],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useSelectionInsights("research-2"));

    act(() => {
      const { setTextSelection } = useResearchStore.getState();
      setTextSelection({ text: "AI ガバナンス" } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loaded");
    expect(result.current.data?.summary).toBe("追加知見");

    act(() => {
      const { clearTextSelection } = useResearchStore.getState();
      clearTextSelection();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loaded");
    expect(result.current.data?.summary).toBe("追加知見");
  });

  it("APIエラー時にはエラーメッセージを設定する", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useSelectionInsights("research-3"));

    act(() => {
      const { setTextSelection } = useResearchStore.getState();
      setTextSelection({ text: "AI" } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("選択テキストの追加調査に失敗");
  });
});
