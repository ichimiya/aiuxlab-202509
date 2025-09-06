/**
 * Execute Research Use Case
 * リサーチ実行のユースケース（アプリケーション層）
 */

import type { Research } from "../../api/generated/models";
import type {
  IResearchAPIRepository,
  ResearchContext,
  PerplexityAPIError,
} from "../../infrastructure/external/perplexity";
import { ResearchDomainService } from "../../domain/research/services";
import type { IContentProcessingRepository } from "../../infrastructure/external/bedrock";

// ========================================
// Use Case
// ========================================

export class ExecuteResearchUseCase {
  private readonly domainService: ResearchDomainService;

  constructor(
    private readonly apiRepository: IResearchAPIRepository,
    contentRepository?: IContentProcessingRepository,
  ) {
    this.domainService = new ResearchDomainService(contentRepository);
  }

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

      // 3. コンテンツ処理（ContentRepository が注入されている場合）
      return await this.domainService.enhanceResearchWithProcessedContent(
        research,
      );
    } catch (error) {
      // エラーハンドリング（アプリケーション層の責務）
      if (this.isPerplexityAPIError(error)) {
        throw error;
      }
      throw new Error(
        `Research execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * PerplexityAPIErrorの型ガード
   */
  private isPerplexityAPIError(error: unknown): error is PerplexityAPIError {
    return error instanceof Error && error.name === "PerplexityAPIError";
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
  return new ExecuteResearchUseCase(apiRepository, contentRepository);
}

// ========================================
// エクスポート
// ========================================

export type { ResearchContext } from "../../infrastructure/external/perplexity";
