import { NextRequest, NextResponse } from "next/server";
import { createOptimizeQueryUseCase } from "@/shared/useCases";
import { optimizeQueryBody } from "@/shared/api/generated/zod";
import type { QueryOptimizationRequest } from "@/shared/domain/queryOptimization/services";

/**
 * クエリ最適化 API
 * POST /api/query-optimization
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { message: "無効なJSONです", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    // バリデーション
    const validation = optimizeQueryBody.safeParse(requestBody);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        {
          message: firstError?.message ?? "無効なリクエストです",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
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
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Query Optimization API error:", error);
    return NextResponse.json(
      {
        message: "クエリ最適化中にエラーが発生しました",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
