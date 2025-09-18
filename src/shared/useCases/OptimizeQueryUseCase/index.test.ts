import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueryOptimizationRequest } from "@/shared/domain/queryOptimization/services";
import {
  OptimizeQueryUseCase,
  type IQueryOptimizationRepository,
} from "./index";

describe("OptimizeQueryUseCase (Application Layer)", () => {
  let useCase: OptimizeQueryUseCase;
  let mockRepository: IQueryOptimizationRepository;

  beforeEach(() => {
    mockRepository = {
      optimizeQuery: vi.fn(),
    };
    useCase = new OptimizeQueryUseCase(mockRepository);
  });

  it("正常系: リポジトリ結果を整形して返す", async () => {
    const req: QueryOptimizationRequest = {
      originalQuery: "AIって危険？",
      selectedText: "[自動運転事故のニュース記事の抜粋]",
      voiceCommand: "deepdive" as any,
      voiceTranscript: "AIって危険？詳しく教えて",
    };

    vi.mocked(mockRepository.optimizeQuery).mockResolvedValueOnce({
      candidates: [
        {
          id: "",
          query: "AI リスク 安全対策 国際比較",
          coverageScore: 1.3,
          coverageExplanation: "安全対策と比較観点を追加",
          addedAspects: ["安全対策", "安全対策", "国際比較"],
          improvementReason: "曖昧さの解消と多角化",
          suggestedFollowups: ["被害規模別の事故統計", "国際的な安全基準"],
        },
        {
          query: "AI リスク 技術別 事故",
          coverageScore: 0.42,
          coverageExplanation: "技術カテゴリ別の事故分析",
          addedAspects: ["技術カテゴリ"],
          improvementReason: "技術観点の明示",
          suggestedFollowups: ["具体的な事故ケース"],
        },
      ],
      evaluationSummary: "安全対策と事故観点を強化",
    } as any);

    const result = await useCase.execute(req);

    expect(mockRepository.optimizeQuery).toHaveBeenCalledWith(req);
    expect(Array.isArray(result.candidates)).toBe(true);
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0].coverageScore).toBeLessThanOrEqual(1);
    expect(result.candidates[0].addedAspects).toEqual(["安全対策", "国際比較"]);
    expect(result.recommendedCandidateId).toBe("candidate-1");
    expect(result.candidates[2].id).toBe("candidate-3");
  });

  it("異常系: 空クエリでバリデーションエラー", async () => {
    await expect(
      useCase.execute({ originalQuery: "  \n  " } as QueryOptimizationRequest),
    ).rejects.toThrow(/must not be empty/i);
  });

  it("異常系: リポジトリエラーをラップしてthrow", async () => {
    vi.mocked(mockRepository.optimizeQuery).mockRejectedValueOnce(
      new Error("Bedrock timeout"),
    );

    const req: QueryOptimizationRequest = { originalQuery: "AIの倫理" };

    await expect(useCase.execute(req)).rejects.toThrow(
      /Query optimization failed: Bedrock timeout/,
    );
  });
});
