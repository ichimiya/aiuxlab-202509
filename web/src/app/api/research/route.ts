import { NextRequest } from "next/server";
import { CreateResearchRequest } from "@/shared/api/generated/models";
import { executeResearchBody } from "@/shared/api/generated/zod";
import { parseJsonBody, fail, ok } from "@/shared/api/http/http";
import { buildCreateResearchUseCase } from "@/shared/useCases/research/factory";

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

    const useCase = buildCreateResearchUseCase({ apiKey });
    const result = await useCase.execute({
      query: validation.data.query,
      selectedText: validation.data.selectedText,
      voiceCommand: validation.data.voiceCommand,
    });

    return ok(result, 202);
  } catch (error) {
    console.error("Research API error:", error);

    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "リサーチの実行中にエラーが発生しました",
      },
      500,
    );
  }
}
