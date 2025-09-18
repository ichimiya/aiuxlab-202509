import { NextRequest } from "next/server";
import { fail, ok } from "@/shared/api/http/http";
import { createResearchRepository } from "@/shared/infrastructure/redis/researchRepository";

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const repository = createResearchRepository();
    const snapshot = await repository.getSnapshot(context.params.id);

    if (!snapshot) {
      return fail(
        {
          code: "NOT_FOUND",
          message: "Research not found",
        },
        404,
      );
    }

    return ok(snapshot, 200);
  } catch (error) {
    console.error("Research snapshot API error:", error);
    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "リサーチの取得中にエラーが発生しました",
      },
      500,
    );
  }
}
