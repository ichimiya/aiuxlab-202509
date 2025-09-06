import { NextRequest, NextResponse } from "next/server";
import { ResearchService } from "@/shared/api/external/perplexity";
import { BedrockContentProcessor } from "@/shared/api/external/bedrock/ContentProcessor";
import { CreateResearchRequest } from "@/shared/api/generated/models";
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

    // 1. リサーチサービスの実行（基本的なHTML変換のみ）
    const researchService = new ResearchService(apiKey);
    const initialResult = await researchService.executeResearch({
      query: validation.data.query,
      selectedText: validation.data.selectedText,
      voiceCommand: validation.data.voiceCommand,
    });

    // 2. BedrockでHTML変換を実行（各results.contentに対して）
    try {
      const bedrockProcessor = new BedrockContentProcessor();

      const enhancedResults = await Promise.all(
        (initialResult.results || []).map(async (result) => {
          try {
            // BedrockでHTML変換を実行
            const enhancedContent = await bedrockProcessor.processContent(
              result.content,
              initialResult.citations || [],
              initialResult.searchResults || [],
            );

            return {
              ...result,
              content: enhancedContent.htmlContent,
              processedCitations: enhancedContent.processedCitations,
            };
          } catch (error) {
            console.warn(
              `Bedrock processing failed for result ${result.id}:`,
              error,
            );
            // フォールバック: 元のコンテンツを使用
            return result;
          }
        }),
      );

      const finalResult = {
        ...initialResult,
        results: enhancedResults,
      };

      return NextResponse.json(finalResult, { status: 200 });
    } catch (error) {
      console.warn(
        "Bedrock enhancement failed, returning basic result:",
        error,
      );
      // フォールバック: 基本的なHTML変換結果を返す
      return NextResponse.json(initialResult, { status: 200 });
    }
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
