import { describe, it, expect } from "vitest";
import type { Research } from "@/shared/api/generated/models";
import {
  QueryOptimizationDomainService,
  type QueryOptimizationRequest,
  type OptimizationResult,
} from "./services";

describe("QueryOptimizationDomainService", () => {
  describe("validateOriginalQuery", () => {
    it("空や空白のみのクエリを拒否", () => {
      expect(() =>
        QueryOptimizationDomainService.validateOriginalQuery("   \n  "),
      ).toThrow(/query must not be empty/i);
    });

    it("過剰に長いクエリを拒否", () => {
      const longQuery = "a".repeat(1001);
      expect(() =>
        QueryOptimizationDomainService.validateOriginalQuery(longQuery),
      ).toThrow(/too long/i);
    });
  });

  describe("buildContextSummary", () => {
    it("選択テキスト・音声コマンド・履歴を要約に含める", () => {
      const history: Research[] = [
        {
          id: "r1",
          query: "AIの安全性",
          status: "completed",
          createdAt: new Date().toISOString(),
        },
        {
          id: "r2",
          query: "自動運転 事故 事例",
          status: "completed",
          createdAt: new Date().toISOString(),
        },
      ];

      const req: QueryOptimizationRequest = {
        originalQuery: "AIって危険？",
        selectedText: "[自動運転事故のニュース記事の抜粋]",
        voiceCommand: "deepdive",
        researchHistory: history,
      };

      const summary = QueryOptimizationDomainService.buildContextSummary(req);
      expect(summary).toContain("選択テキスト");
      expect(summary).toContain("自動運転事故");
      expect(summary).toContain("音声コマンド");
      expect(summary).toContain("deepdive");
      expect(summary).toContain("履歴");
      expect(summary).toContain("AIの安全性");
      expect(summary).toContain("自動運転 事故 事例");
    });
  });

  describe("formatOptimizationResult", () => {
    it("confidenceを0-1にクランプし、観点の重複を除去", () => {
      const raw: Partial<OptimizationResult> = {
        optimizedQuery: "AIのリスクと安全対策の包括的評価",
        addedAspects: [
          "規制動向",
          "事故事例",
          "規制動向", // duplicate
          "専門家の見解",
        ],
        improvementReason: "曖昧さを排除し複数観点を付加",
        confidence: 1.2, // out of range
        suggestedFollowups: ["近年の規制改正", "被害の規模別分析"],
      };

      const formatted = QueryOptimizationDomainService.formatOptimizationResult(
        raw as OptimizationResult,
      );

      expect(formatted.confidence).toBeLessThanOrEqual(1);
      expect(formatted.confidence).toBeGreaterThanOrEqual(0);
      expect(new Set(formatted.addedAspects).size).toBe(
        formatted.addedAspects.length,
      );
    });
  });
});
