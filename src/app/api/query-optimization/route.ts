import { NextRequest } from "next/server";
import { createOptimizeQueryUseCase } from "@/shared/useCases";
import { optimizeQueryBody } from "@/shared/api/generated/zod";
import type { QueryOptimizationRequest } from "@/shared/domain/queryOptimization/services";
import { parseJsonBody, fail, ok } from "@/shared/api/http/http";

/**
 * クエリ最適化 API
 * POST /api/query-optimization
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析（共通）
    const parsed = await parseJsonBody(request);
    if (parsed.status !== 200) return parsed;
    const requestBody = await parsed.json();

    // バリデーション
    const validation = optimizeQueryBody.safeParse(requestBody);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return fail(
        {
          code: "VALIDATION_ERROR",
          message: firstError?.message ?? "無効なリクエストです",
        },
        400,
      );
    }

    // ユースケース実行
    const useCase = createOptimizeQueryUseCase();
    const normalized: QueryOptimizationRequest = {
      ...validation.data,
      userContext:
        // zodのnullishとDomain型のundefined差分を吸収
        (
          validation.data as {
            userContext?: QueryOptimizationRequest["userContext"] | null;
          }
        ).userContext ?? undefined,
    };
    const result = await useCase.execute(normalized);
    return ok(result, 200);
  } catch (error) {
    console.error("Query Optimization API error:", error);
    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "クエリ最適化中にエラーが発生しました",
      },
      500,
    );
  }
}
