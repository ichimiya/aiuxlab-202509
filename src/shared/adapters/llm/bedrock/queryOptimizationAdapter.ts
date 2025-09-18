import { BaseBedrockClient } from "@/shared/infrastructure/clients/bedrock/BedrockClient";
import type {
  QueryOptimizationRequest,
  OptimizationResult,
} from "@/shared/domain/queryOptimization/services";
import {
  temporalContext,
  expansionPolicy,
  jsonSchema,
} from "@/shared/ai/prompts/utils";
import { QueryOptimizationDomainService } from "@/shared/domain/queryOptimization/services";

export class BedrockQueryOptimizationAdapter extends BaseBedrockClient {
  async optimizeQuery(
    req: QueryOptimizationRequest,
  ): Promise<OptimizationResult> {
    const prompt = this.buildPrompt(req);
    const text = await this.invokePrompt(prompt);
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!hasCandidateArray(parsed)) {
        throw new Error("missing candidates");
      }
      return parsed;
    } catch (error) {
      if (error instanceof Error && /missing candidates/i.test(error.message)) {
        throw new Error("Invalid optimization response: candidates not found");
      }
      throw new Error("Invalid optimization response: Non-JSON text");
    }
  }

  private buildPrompt(req: QueryOptimizationRequest): string {
    const schema = [
      '  "candidates": [',
      "    {",
      '      "id": string,',
      '      "query": string,',
      '      "coverageScore": number,',
      '      "coverageExplanation": string,',
      '      "addedAspects"?: string[],',
      '      "improvementReason"?: string,',
      '      "suggestedFollowups"?: string[]',
      "    }",
      "  ],",
      '  "evaluationSummary"?: string,',
      '  "recommendedCandidateId"?: string',
    ];
    const contextSummary =
      QueryOptimizationDomainService.buildContextSummary(req);
    return [
      "### ROLE",
      "あなたは世界最高レベルのリサーチクエリ最適化専門家です。ユーザーの曖昧・不完全な質問を、効果的で検索効率の高いクエリへ変換します。",
      temporalContext(),
      "",
      "### CONTEXT",
      contextSummary || "(なし)",
      "",
      "### INPUT_QUERY",
      req.originalQuery,
      "",
      "### PRINCIPLES",
      "1. 具体性と明確性を高める",
      "2. 多角的な調査観点（Who/What/When/Where/Why/How、比較・トレンド・データ・実務観点）を適切に追加",
      "3. 検索効率（固有名詞・時制・条件・評価指標）を最適化",
      "4. ユーザーの潜在的な意図を先取りしつつ過剰拡張は避ける",
      "5. 候補は必ず3件生成し、互いに観点が異なるよう調整する",
      "6. 各候補にcoverageScore(0〜1)、coverageExplanationを必須で付与する",
      "7. 出力言語は入力と同じ言語に合わせる",
      "8. 不確実・曖昧表現は具体語に置換（例: ‘最近’→時制コンテキストの範囲など）",
      "",
      expansionPolicy("minimal"),
      "",
      jsonSchema(schema),
    ].join("\n");
  }
}

function hasCandidateArray(value: unknown): value is OptimizationResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidates = (value as { candidates?: unknown }).candidates;
  return Array.isArray(candidates);
}
