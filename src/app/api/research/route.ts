import { NextRequest, NextResponse } from "next/server";
import { createExecuteResearchUseCase } from "@/shared/useCases";
import { CreateResearchRequest } from "@/shared/api/generated/models";
import type { VoicePattern } from "@/shared/api/generated/models";
import { executeResearchBody } from "@/shared/api/generated/zod";

/**
 * リサーチ実行API
 * POST /api/research
 */
export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          message: "Perplexity API key is not configured",
          code: "API_KEY_MISSING",
        },
        { status: 500 },
      );
    }

    // リクエストボディの解析
    let requestBody: CreateResearchRequest;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { message: "無効なJSONです", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    // リクエストバリデーション
    const validation = executeResearchBody.safeParse(requestBody);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        {
          message: firstError ? firstError.message : "無効なリクエストです",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // リサーチユースケースの実行（コンテンツ処理も含む）
    const executeResearchUseCase = createExecuteResearchUseCase(apiKey);
    const result = await executeResearchUseCase.execute({
      query: validation.data.query,
      selectedText: validation.data.selectedText,
      voiceCommand: validation.data.voiceCommand as VoicePattern, // 型アサーション
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Research API error:", error);

    return NextResponse.json(
      {
        message: "リサーチの実行中にエラーが発生しました",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
