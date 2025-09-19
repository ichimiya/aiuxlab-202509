import { describe, it, expect } from "vitest";
import type { Research } from "@/shared/api/generated/models";
import {
  QueryOptimizationDomainService,
  type QueryOptimizationRequest,
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

    it("セッション履歴の過去クエリを要約に含める", () => {
      const req: QueryOptimizationRequest = {
        originalQuery: "AIの安全対策",
        sessionHistory: [
          {
            request: {
              originalQuery: "AIのリスク",
              voiceTranscript: "AIのリスクを教えて",
              voiceCommand: "deepdive",
            },
            result: {
              candidates: [
                {
                  id: "candidate-1",
                  query: "AI リスク 重大事例",
                  coverageScore: 0.8,
                  coverageExplanation: "重大事例を追加",
                  addedAspects: ["重大事例"],
                  improvementReason: "事故観点を補強",
                  suggestedFollowups: [],
                },
              ],
              recommendedCandidateId: "candidate-1",
            },
          },
        ],
      } as unknown as QueryOptimizationRequest;

      const summary = QueryOptimizationDomainService.buildContextSummary(req);
      expect(summary).toContain("セッション履歴");
      expect(summary).toContain("AIのリスク");
      expect(summary).toContain("AI リスク 重大事例");
    });
  });

  describe("formatOptimizationResult", () => {
    it("候補のID付与・スコア正規化・重複除去を行う", () => {
      const raw = {
        candidates: [
          {
            id: "",
            query: "AI リスク 安全対策",
            coverageScore: 1.4, // out of range
            coverageExplanation: "幅広く網羅",
            addedAspects: ["規制動向", "規制動向", "事故事例"],
            improvementReason: "曖昧さを排除",
            suggestedFollowups: ["国際比較", ""].filter(Boolean) as string[],
          },
          {
            // id欠如
            query: "AI 倫理 リスク 比較",
            coverageScore: -0.2,
            coverageExplanation: "倫理面を補強",
            addedAspects: ["倫理規範"],
            improvementReason: "倫理観点の追加",
            suggestedFollowups: ["ガイドライン一覧"],
          },
        ],
        evaluationSummary: "  全体として網羅的に改善  ",
        recommendedCandidateId: undefined,
      } as const;

      const formatted = QueryOptimizationDomainService.formatOptimizationResult(
        raw as any,
      ) as any;

      expect(formatted.candidates).toHaveLength(3);
      expect(formatted.candidates[0].id).toBe("candidate-1");
      expect(formatted.candidates[0].coverageScore).toBeLessThanOrEqual(1);
      expect(formatted.candidates[0].coverageScore).toBeGreaterThanOrEqual(0);
      expect(formatted.candidates[0].addedAspects).toEqual([
        "規制動向",
        "事故事例",
      ]);
      expect(formatted.candidates[1].coverageScore).toBeGreaterThanOrEqual(0);
      expect(formatted.candidates[2].id).toBe("candidate-3");
      expect(formatted.recommendedCandidateId).toBe("candidate-1");
      expect(formatted.evaluationSummary).toBe("全体として網羅的に改善");
    });
  });
});
