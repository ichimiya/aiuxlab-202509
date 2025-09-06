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
      voiceCommand: "deepdive",
    };

    vi.mocked(mockRepository.optimizeQuery).mockResolvedValueOnce({
      optimizedQuery: "AI技術のリスク要因と安全対策の包括的評価",
      addedAspects: ["規制動向", "事故事例", "規制動向"],
      improvementReason: "曖昧さの解消と観点追加",
      confidence: 1.2,
      suggestedFollowups: ["国際比較", "近年の規制改正"],
    });

    const result = await useCase.execute(req);

    expect(mockRepository.optimizeQuery).toHaveBeenCalled();
    expect(result.optimizedQuery).toMatch(/リスク要因/);
    // 重複が除去されている
    expect(new Set(result.addedAspects).size).toBe(result.addedAspects.length);
    // 信頼度は0-1にクランプ
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
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
