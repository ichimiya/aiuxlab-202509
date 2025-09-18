/**
 * Optimize Query Use Case
 * クエリ最適化のユースケース（アプリケーション層）
 */

import type {
  OptimizationResult,
  QueryOptimizationRequest,
} from "@/shared/domain/queryOptimization/services";
import { QueryOptimizationDomainService } from "@/shared/domain/queryOptimization/services";

export interface IQueryOptimizationRepository {
  optimizeQuery(req: QueryOptimizationRequest): Promise<OptimizationResult>;
}

export class OptimizeQueryUseCase {
  constructor(private readonly repository: IQueryOptimizationRepository) {}

  async execute(req: QueryOptimizationRequest): Promise<OptimizationResult> {
    QueryOptimizationDomainService.validateOriginalQuery(req.originalQuery);

    try {
      const raw = await this.repository.optimizeQuery(req);
      return QueryOptimizationDomainService.formatOptimizationResult(raw, {
        fallbackQuery: req.originalQuery,
      });
    } catch (error) {
      throw new Error(
        `Query optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

// Factory Function
import { createQueryOptimizationAdapter } from "@/shared/infrastructure/external/llm/factory";

export function createOptimizeQueryUseCase(): OptimizeQueryUseCase {
  const repo = createQueryOptimizationAdapter();
  return new OptimizeQueryUseCase(repo);
}
