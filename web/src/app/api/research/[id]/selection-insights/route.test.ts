import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const execute = vi.fn();

vi.mock("@/shared/useCases/GenerateSelectionInsightsUseCase", () => ({
  createGenerateSelectionInsightsUseCase: vi.fn(() => ({
    execute,
  })),
}));

describe("POST /api/research/:id/selection-insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("選択テキストを渡してインサイトを返す", async () => {
    execute.mockResolvedValueOnce({
      summary: "ガバナンス観点の追加知見",
      insights: [
        {
          id: "topic-1",
          title: "国際規制のアップデート",
          summary: "主要規制の最新スケジュールを整理",
          keyPoints: [
            {
              label: "EU AI Act",
              detail: "2025年にフェーズ適用開始",
            },
          ],
          recommendedSources: [],
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost:3000/api/research/res-1/selection-insights",
      {
        method: "POST",
        body: JSON.stringify({
          selection: {
            text: "AI リスク",
            context: "AI リスクに関する段落",
            origin: {
              nodeId: "section-risk",
              resultId: "result-001",
            },
            section: {
              heading: "リスク概要",
              summary: "リスク概要: 運用・倫理・法規制の３分類",
            },
          },
          researchQuery: " 最新AI リスク 調査 ",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "res-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      researchId: "res-1",
      researchQuery: " 最新AI リスク 調査 ",
      selection: {
        text: "AI リスク",
        context: "AI リスクに関する段落",
        origin: {
          nodeId: "section-risk",
          resultId: "result-001",
        },
        section: {
          heading: "リスク概要",
          summary: "リスク概要: 運用・倫理・法規制の３分類",
        },
      },
    });
    expect(data.summary).toBe("ガバナンス観点の追加知見");
    expect(Array.isArray(data.insights)).toBe(true);
    expect(data.insights).toHaveLength(1);
    expect(data.insights[0]?.title).toBe("国際規制のアップデート");
  });

  it("入力が不正なら400を返す", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/research/res-1/selection-insights",
      {
        method: "POST",
        body: JSON.stringify({
          selection: {
            text: "",
          },
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "res-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_REQUEST");
    expect(execute).not.toHaveBeenCalled();
  });

  it("ユースケースが失敗したら500を返す", async () => {
    execute.mockRejectedValueOnce(new Error("LLM error"));

    const request = new NextRequest(
      "http://localhost:3000/api/research/res-1/selection-insights",
      {
        method: "POST",
        body: JSON.stringify({
          selection: {
            text: "AI リスク",
          },
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "res-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
