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

// ========================================
// Use Case
// ========================================

export class ExecuteResearchUseCase {
  private readonly domainService: ResearchDomainService;

  constructor(private readonly apiRepository: IResearchAPIRepository) {
    this.domainService = new ResearchDomainService();
  }

  /**
   * リサーチを実行する（ユースケースの流れ）
   */
  async execute(context: ResearchContext): Promise<Research> {
    try {
      // 1. 外部API呼び出し（Infrastructure層）
      const perplexityResponse = await this.apiRepository.search(context);

      // 2. ドメインロジックでの変換（Domain層）
      return this.domainService.transformToResearch(
        context,
        perplexityResponse,
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

export function createExecuteResearchUseCase(
  apiKey: string,
): ExecuteResearchUseCase {
  const apiRepository = new PerplexityClient({ apiKey });
  return new ExecuteResearchUseCase(apiRepository);
}

// ========================================
// エクスポート
// ========================================

export type { ResearchContext } from "../../infrastructure/external/perplexity";
