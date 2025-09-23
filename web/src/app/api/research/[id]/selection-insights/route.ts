import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/shared/api/http/http";
import { createGenerateSelectionInsightsUseCase } from "@/shared/useCases/GenerateSelectionInsightsUseCase";
import { ApplicationError } from "@/shared/useCases/errors";

const SelectionMetadataSchema = z.object({
  wordCount: z.number().int().nonnegative(),
  language: z.enum(["ja", "en", "unknown"]),
  selectionType: z.enum(["paragraph", "sentence", "phrase", "word"]),
  url: z.string().url().optional(),
  title: z.string().optional(),
  timestamp: z.string(),
});

const BodySchema = z.object({
  selection: z.object({
    text: z.string().min(1, "selection.text is required"),
    context: z.string().optional(),
    metadata: SelectionMetadataSchema.optional(),
  }),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch (error) {
    return fail(
      {
        code: "INVALID_JSON",
        message: "JSONの解析に失敗しました",
      },
      400,
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return fail(
      {
        code: "INVALID_REQUEST",
        message: firstIssue?.message || "入力が不正です",
      },
      400,
    );
  }

  const useCase = createGenerateSelectionInsightsUseCase();

  try {
    const result = await useCase.execute({
      researchId: id,
      selection: parsed.data.selection,
    });
    return ok(result, 200);
  } catch (error) {
    if (error instanceof ApplicationError) {
      return fail(
        {
          code: error.code ?? "APPLICATION_ERROR",
          message: error.message,
        },
        error.status ?? 500,
      );
    }

    console.error("Selection insight API error", error);
    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "選択テキストの追加調査に失敗しました",
      },
      500,
    );
  }
}
