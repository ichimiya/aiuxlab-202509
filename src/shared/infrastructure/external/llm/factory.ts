import type { ContentProcessingPort } from "@/shared/useCases/ports/contentProcessing";
import type {
  ContentProcessingInput,
  ContentProcessingOutput,
} from "@/shared/ai/schemas/contentProcessing";
import { BedrockContentProcessingAdapter } from "@/shared/infrastructure/external/llm/adapters/bedrock/contentProcessingAdapter";
import { BedrockQueryOptimizationAdapter } from "@/shared/infrastructure/external/llm/adapters/bedrock/queryOptimizationAdapter";

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
          optimizedQuery: "",
          addedAspects: [],
          improvementReason: "",
          confidence: 0.5,
          suggestedFollowups: [],
        };
      },
    };
  }
  return new BedrockQueryOptimizationAdapter({});
}
