import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GenerateSelectionInsightsUseCase,
  createGenerateSelectionInsightsUseCase,
} from "./index";
import type { SelectionInsightPort } from "../ports/selectionInsights";
import type { TextSelection } from "@/shared/stores/researchStore";
import { ApplicationError } from "../errors";

const mockPort: SelectionInsightPort = {
  generate: vi.fn(),
};

vi.mock("@/shared/infrastructure/external/llm/factory", () => ({
  createSelectionInsightAdapter: vi.fn(() => mockPort),
}));

describe("GenerateSelectionInsightsUseCase", () => {
  let useCase: GenerateSelectionInsightsUseCase;
  let selection: TextSelection;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GenerateSelectionInsightsUseCase(mockPort);
    selection = {
      text: "生成AIのリスク",
      context: "生成AIのリスクとガバナンスに関する段落...",
      metadata: {
        language: "ja",
        selectionType: "paragraph",
        wordCount: 24,
        url: "https://example.com/report",
        title: "AIリスクレポート",
        timestamp: "2025-09-23T10:00:00.000Z",
      },
    };
  });

  it("選択テキストのインサイトを生成する", async () => {
    const expected = {
      summary: "生成AIリスクの管理は国際的な規制動向の把握が鍵",
      insights: [
        {
          id: "followup-1",
          title: "規制とガバナンスの最新動向",
          summary: "2025年時点の主要国におけるガバナンス更新を整理",
          keyPoints: [
            {
              label: "EU AI Act",
              detail: "2025年Q1に施行フェーズへ移行予定",
            },
          ],
          recommendedSources: [
            {
              title: "EU AI Act オフィシャルアップデート",
              url: "https://example.com/eu-ai-act",
              reason: "最新の施行スケジュール",
            },
          ],
        },
      ],
    };

    vi.mocked(mockPort.generate).mockResolvedValueOnce(expected);

    const result = await useCase.execute({
      researchId: "research-123",
      selection,
    });

    expect(mockPort.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        researchId: "research-123",
        researchQuery: undefined,
        selection: expect.objectContaining({
          text: selection.text,
          context: selection.context,
        }),
      }),
    );
    expect(result).toEqual(expected);
  });

  it("ポートでエラーが発生したらApplicationErrorを送出する", async () => {
    vi.mocked(mockPort.generate).mockRejectedValueOnce(
      new Error("bedrock down"),
    );

    await expect(
      useCase.execute({
        researchId: "research-123",
        selection,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});

describe("createGenerateSelectionInsightsUseCase", () => {
  it("ファクトリがユースケースを生成する", () => {
    const useCase = createGenerateSelectionInsightsUseCase();
    expect(useCase).toBeInstanceOf(GenerateSelectionInsightsUseCase);
  });
});
