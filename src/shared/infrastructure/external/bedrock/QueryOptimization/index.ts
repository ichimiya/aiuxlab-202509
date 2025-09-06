import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  QueryOptimizationRequest,
  OptimizationResult,
} from "@/shared/domain/queryOptimization/services";
import { QueryOptimizationDomainService } from "@/shared/domain/queryOptimization/services";

export interface BedrockOptimizationConfig {
  region?: string;
  modelId?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

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

export class BedrockQueryOptimizationClient {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(config: BedrockOptimizationConfig = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.region || process.env.AWS_REGION || "us-east-1",
      credentials: config.credentials || {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.modelId =
      config.modelId ||
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-haiku-20240307-v1:0";
  }

  async optimizeQuery(
    req: QueryOptimizationRequest,
  ): Promise<OptimizationResult> {
    QueryOptimizationDomainService.validateOriginalQuery(req.originalQuery);

    const prompt = this.buildPrompt(req);

    try {
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1200,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const response = await this.client.send(command);
      const raw = JSON.parse(new TextDecoder().decode(response.body)) as {
        content: Array<{ text: string }>;
      };
      const text = raw?.content?.[0]?.text;
      if (!text) throw new Error("Empty response");
      try {
        return JSON.parse(text) as OptimizationResult;
      } catch {
        throw new BedrockOptimizationAPIError(
          "Invalid optimization response: Non-JSON text",
        );
      }
    } catch (e) {
      if (e instanceof BedrockOptimizationAPIError) throw e;
      throw new BedrockOptimizationAPIError(
        `Bedrock API error: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  private buildPrompt(req: QueryOptimizationRequest): string {
    const contextSummary =
      QueryOptimizationDomainService.buildContextSummary(req);
    const now = new Date();
    const y = now.getFullYear();
    const recentRange = `${y - 2}–${y}`;
    const todayIso = now.toISOString().slice(0, 10);
    return [
      "### ROLE",
      "あなたは世界最高レベルのリサーチクエリ最適化専門家です。ユーザーの曖昧・不完全な質問を、効果的で検索効率の高いクエリへ変換します。",
      "",
      "### TEMPORAL_CONTEXT",
      `TODAY: ${todayIso}`,
      `CURRENT_YEAR: ${y}`,
      `PREV_YEAR: ${y - 1}`,
      `RECENT_RANGE: ${recentRange}`,
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
      `6. 不確実・曖昧表現は具体語に置換（例: ‘最近’→‘${recentRange}’など適切な範囲）`,
      "",
      "### EXPANSION_POLICY",
      "MODE: minimal",
      "- 必須の明確化のみ（年・対象範囲・固有名詞の正規化）",
      "- 過剰な拡張を禁止（例: 地域分布・比較・要因分析などの派生カテゴリは、明示指示がない限り追加しない）",
      "- 追加観点は最大1件。不要なら0件。",
      "- ‘一覧’や‘定義’などユーザー意図が明確な場合は、その意図に忠実な最小表現に留める",
      "",
      "### OUTPUT_JSON_SCHEMA",
      "{",
      '  "optimizedQuery": string,',
      '  "addedAspects": string[],',
      '  "improvementReason": string,',
      '  "confidence": number,',
      '  "suggestedFollowups": string[]',
      "}",
      "",
      "### OUTPUT_JSON_ONLY",
      "- 厳密なJSONのみを1つ返す（プレーンテキスト・注釈・コードブロック・説明は一切禁止）",
      "- keyは上記5つのみ。順序は任意。値は空文字でも可。",
      "- confidenceは0.0〜1.0の小数。",
    ].join("\n");
  }
}
