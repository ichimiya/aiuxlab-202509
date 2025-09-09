import { NextRequest } from "next/server";
import {
  createExecuteResearchUseCase,
  ApplicationError,
} from "@/shared/useCases";
import { CreateResearchRequest } from "@/shared/api/generated/models";
import type { VoicePattern } from "@/shared/api/generated/models";
import { executeResearchBody } from "@/shared/api/generated/zod";
import { parseJsonBody, fail, ok } from "@/shared/api/http/http";

/**
 * リサーチ実行API
 * POST /api/research
 */
export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return fail(
        {
          code: "API_KEY_MISSING",
          message: "Perplexity API key is not configured",
        },
        500,
      );
    }

    // リクエストボディの解析（共通）
    const parsed = await parseJsonBody(request);
    if (parsed.status !== 200) return parsed;
    const requestBody = (await parsed.json()) as CreateResearchRequest;

    // リクエストバリデーション
    const validation = executeResearchBody.safeParse(requestBody);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return fail(
        {
          code: "VALIDATION_ERROR",
          message: firstError ? firstError.message : "無効なリクエストです",
        },
        400,
      );
    }

    // リサーチユースケースの実行（コンテンツ処理も含む）
    const executeResearchUseCase = createExecuteResearchUseCase(apiKey);
    const result = await executeResearchUseCase.execute({
      query: validation.data.query,
      selectedText: validation.data.selectedText,
      voiceCommand: validation.data.voiceCommand as VoicePattern, // 型アサーション
    });

    return ok(result, 200);
  } catch (error) {
    console.error("Research API error:", error);

    // アプリケーション層のエラーであればステータス/コードを反映
    if (error instanceof ApplicationError) {
      return fail(
        {
          code: error.code || "INTERNAL_ERROR",
          message: error.message || "リサーチの実行中にエラーが発生しました",
        },
        error.status || 500,
      );
    }

    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "リサーチの実行中にエラーが発生しました",
      },
      500,
    );
  }
}
