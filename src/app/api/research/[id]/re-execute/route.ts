import { NextRequest } from "next/server";
import { fail, ok } from "@/shared/api/http/http";
import { buildReExecuteResearchUseCase } from "@/shared/useCases/research/factory";

export async function POST(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  try {
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

    const useCase = buildReExecuteResearchUseCase({ apiKey });
    const snapshot = await useCase.execute({ researchId: context.params.id });

    return ok(snapshot, 202);
  } catch (error) {
    console.error("Research re-execute API error:", error);
    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "追いリサーチの実行中にエラーが発生しました",
      },
      500,
    );
  }
}
