import type {
  QueryOptimizationRequest,
  OptimizationResult,
} from "@/shared/domain/queryOptimization/services";
import { QueryOptimizationDomainService } from "@/shared/domain/queryOptimization/services";
import {
  BaseBedrockClient,
  temporalContext,
  expansionPolicy,
  jsonSchema,
} from "../common";

export class BedrockOptimizationAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BedrockOptimizationAPIError";
  }
}

export class BedrockQueryOptimizationClient extends BaseBedrockClient {
  async optimizeQuery(
    req: QueryOptimizationRequest,
  ): Promise<OptimizationResult> {
    QueryOptimizationDomainService.validateOriginalQuery(req.originalQuery);
    const prompt = this.buildPrompt(req);
    try {
      const text = await this.invokePrompt(prompt);
      try {
        return JSON.parse(text) as OptimizationResult;
      } catch {
        throw new BedrockOptimizationAPIError(
          "Invalid optimization response: Non-JSON text",
        );
      }
    } catch (e) {
      throw new BedrockOptimizationAPIError(
        `Bedrock API error: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  private buildPrompt(req: QueryOptimizationRequest): string {
    const contextSummary =
      QueryOptimizationDomainService.buildContextSummary(req);
    const schema = [
      '  "optimizedQuery": string,',
      '  "addedAspects": string[],',
      '  "improvementReason": string,',
      '  "confidence": number,',
      '  "suggestedFollowups": string[]',
    ];
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
      "5. 出力言語は入力と同じ言語に合わせる",
      "6. 不確実・曖昧表現は具体語に置換（例: ‘最近’→時制コンテキストの範囲など）",
      "",
      expansionPolicy("minimal"),
      "",
      jsonSchema(schema),
    ].join("\n");
  }
}
