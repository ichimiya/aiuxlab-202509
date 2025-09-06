/**
 * Execute Research Use Case
 * リサーチ実行のユースケース（アプリケーション層）
 */

import type { Research } from "../../api/generated/models";
import type {
  IResearchAPIRepository,
  ResearchContext,
} from "../../infrastructure/external/perplexity";
import { ResearchDomainService } from "../../domain/research/services";
import { ApplicationError } from "../errors";

// ========================================
// Use Case
// ========================================

export class ExecuteResearchUseCase {
  constructor(
    private readonly apiRepository: IResearchAPIRepository,
    private readonly domainService: ResearchDomainService,
  ) {}

  /**
   * リサーチを実行する（ユースケースの流れ）
   */
  async execute(context: ResearchContext): Promise<Research> {
    try {
      // 1. 外部API呼び出し（Infrastructure層）
      const perplexityResponse = await this.apiRepository.search(context);

      // 2. ドメインロジックでの変換（Domain層）
      const research = this.domainService.transformToResearch(
        context,
        perplexityResponse,
      );

      const start =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      // 3. コンテンツ処理（ContentRepository が注入されている場合）
      const enhanced =
        await this.domainService.enhanceResearchWithProcessedContent(research);
      const end =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const durationMs = end - start;
      if (durationMs > 0) {
        // 軽量ログ（計測のみ）

        console.debug(
          "enhanceResearchWithProcessedContent duration(ms):",
          Math.round(durationMs),
        );
      }
      return enhanced;
    } catch (error) {
      // アプリケーション層の責務として統一的にラップ
      const message = `Research execution failed${error instanceof Error && error.message ? `: ${error.message}` : ""}`;
      const isUpstream =
        error instanceof Error && error.name?.includes("PerplexityAPIError");
      throw new ApplicationError(message, {
        code: isUpstream ? "UPSTREAM_ERROR" : "UNKNOWN_ERROR",
        status: isUpstream ? 502 : 500,
        cause: error,
      });
    }
  }
}

// ========================================
// Factory Function (依存性注入の簡易版)
// ========================================

import { PerplexityClient } from "../../infrastructure/external/perplexity";
import { BedrockClient } from "../../infrastructure/external/bedrock";

export function createExecuteResearchUseCase(
  apiKey: string,
): ExecuteResearchUseCase {
  const apiRepository = new PerplexityClient({ apiKey });
  const contentRepository = new BedrockClient();
  const domainService = new ResearchDomainService(contentRepository);
  return new ExecuteResearchUseCase(apiRepository, domainService);
}

// ========================================
// エクスポート
// ========================================

export type { ResearchContext } from "../../infrastructure/external/perplexity";
