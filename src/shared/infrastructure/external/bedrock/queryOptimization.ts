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
    return `あなたは世界最高レベルのリサーチクエリ最適化専門家です。\nユーザーの曖昧・不完全な質問を効果的なリサーチクエリに変換してください。\n\n【文脈要約】\n${contextSummary}\n\n【最適化対象クエリ】\n${req.originalQuery}\n\n【最適化原則】\n1. 具体性と明確性の向上\n2. 多角的な調査観点の追加\n3. 検索効率の最適化\n4. ユーザーの潜在的な疑問の先取り\n\n【出力形式(JSON)】\n{\n  "optimizedQuery": string,\n  "addedAspects": string[],\n  "improvementReason": string,\n  "confidence": number,\n  "suggestedFollowups": string[]\n}\n\n必ず厳密なJSONのみを返してください。`;
  }
}
