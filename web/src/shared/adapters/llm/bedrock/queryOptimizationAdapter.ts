import { BaseBedrockClient } from "@/shared/infrastructure/clients/bedrock/BedrockClient";
import type {
  QueryOptimizationRequest,
  OptimizationResult,
} from "@/shared/domain/queryOptimization/services";
import { QueryOptimizationDomainService } from "@/shared/domain/queryOptimization/services";
import {
  buildQueryOptimizationPrompt,
  type QueryOptimizationPrompt,
} from "@/shared/ai/prompts/queryOptimization";

export class BedrockQueryOptimizationAdapter extends BaseBedrockClient {
  async optimizeQuery(
    req: QueryOptimizationRequest,
  ): Promise<OptimizationResult> {
    const prompt = this.buildPrompt(req);
    if (process.env.DEBUG_QUERY_OPTIMIZATION_PROMPT) {
      console.log(
        [
          "[QueryOptimizationPrompt]",
          "SYSTEM:",
          prompt.system,
          "",
          "USER:",
          prompt.user,
        ].join("\n"),
      );
    }

    const text = await this.invokePrompt({
      system: prompt.system,
      user: prompt.user,
    });
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

  private buildPrompt(req: QueryOptimizationRequest): QueryOptimizationPrompt {
    const contextSummary =
      QueryOptimizationDomainService.buildContextSummary(req);
    return buildQueryOptimizationPrompt({
      request: req,
      contextSummary,
    });
  }
}

function hasCandidateArray(value: unknown): value is OptimizationResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidates = (value as { candidates?: unknown }).candidates;
  return Array.isArray(candidates);
}
