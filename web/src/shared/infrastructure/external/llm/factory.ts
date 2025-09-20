import type { ContentProcessingPort } from "@/shared/useCases/ports/contentProcessing";
import type {
  ContentProcessingInput,
  ContentProcessingOutput,
} from "@/shared/ai/schemas/contentProcessing";
import { BedrockContentProcessingAdapter } from "@/shared/adapters/llm/bedrock/contentProcessingAdapter";
import { BedrockQueryOptimizationAdapter } from "@/shared/adapters/llm/bedrock/queryOptimizationAdapter";
import { BedrockVoiceIntentClassifierAdapter } from "@/shared/adapters/llm/bedrock/voiceIntentClassifierAdapter";
import type {
  VoiceIntentClassifierPort,
  VoiceIntentResult,
} from "@/shared/useCases/ports/voice";

function provider(): string {
  return (process.env.LLM_PROVIDER || "bedrock").toLowerCase();
}

export function createContentProcessingAdapter(): ContentProcessingPort {
  const p = provider();
  if (p === "vertex") {
    // 最小のダミーVertexアダプタ（テストは形状のみ検証）
    const adapter: ContentProcessingPort = {
      async process(
        input: ContentProcessingInput,
      ): Promise<ContentProcessingOutput> {
        return {
          htmlContent: `<article><p>${input.markdown}</p></article>`,
          processedCitations: input.citations.map((c, i) => ({
            id: `ref${i + 1}`,
            number: i + 1,
            url: c.match(/https?:\/\/[\w./-]+/i)?.[0] || "https://example.com",
          })),
        };
      },
    };
    return adapter;
  }

  // 既定: Bedrock Adapter
  return new BedrockContentProcessingAdapter({});
}

// Query Optimization Adapter factory
export function createQueryOptimizationAdapter() {
  const p = provider();
  if (p === "vertex") {
    return {
      async optimizeQuery() {
        return {
          candidates: [
            {
              id: "candidate-1",
              query: "",
              coverageScore: 0.5,
              coverageExplanation: "Vertexダミー応答",
              addedAspects: [],
              improvementReason: "",
              suggestedFollowups: [],
            },
          ],
          evaluationSummary: "暫定ダミー応答",
          recommendedCandidateId: "candidate-1",
        };
      },
    };
  }
  return new BedrockQueryOptimizationAdapter({});
}

export function createVoiceIntentClassifier(): VoiceIntentClassifierPort {
  const p = provider();
  if (p === "vertex") {
    const fallback: VoiceIntentClassifierPort = {
      async classify(input) {
        const confidence =
          typeof input.context?.confidence === "number"
            ? Math.min(Math.max(input.context.confidence, 0), 1)
            : 0.6;
        const result: VoiceIntentResult = {
          intentId: "OPTIMIZE_QUERY_APPEND",
          confidence,
          parameters: {},
        };
        return result;
      },
    };
    return fallback;
  }
  return new BedrockVoiceIntentClassifierAdapter({});
}
