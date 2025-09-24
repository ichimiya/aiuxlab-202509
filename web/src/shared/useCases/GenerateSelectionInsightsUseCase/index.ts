import { ApplicationError } from "../errors";
import type { SelectionInsightPort } from "../ports/selectionInsights";
import type { TextSelection } from "@/shared/stores/researchStore";
import { createSelectionInsightAdapter } from "@/shared/infrastructure/external/llm/factory";

export interface GenerateSelectionInsightsInput {
  researchId: string;
  selection: TextSelection;
  researchQuery?: string;
}

export class GenerateSelectionInsightsUseCase {
  constructor(private readonly port: SelectionInsightPort) {}

  async execute({
    researchId,
    selection,
    researchQuery,
  }: GenerateSelectionInsightsInput) {
    if (!researchId?.trim()) {
      throw new ApplicationError("researchId is required", {
        code: "INVALID_INPUT",
        status: 400,
      });
    }

    if (!selection || typeof selection.text !== "string") {
      throw new ApplicationError("selection.text is required", {
        code: "INVALID_SELECTION",
        status: 400,
      });
    }

    const trimmedText = selection.text.trim();
    if (trimmedText.length === 0) {
      throw new ApplicationError("selection.text is empty", {
        code: "INVALID_SELECTION",
        status: 400,
      });
    }

    const payload = {
      researchId,
      selection: {
        ...selection,
        text: trimmedText,
        context: selection.context?.trim()?.length
          ? selection.context.trim()
          : undefined,
      },
      researchQuery: researchQuery?.trim() ? researchQuery.trim() : undefined,
    } as const;

    try {
      return await this.port.generate(payload);
    } catch (error) {
      throw new ApplicationError("選択テキストの追加調査に失敗しました", {
        code: "INSIGHT_GENERATION_FAILED",
        status: 502,
        cause: error,
      });
    }
  }
}

export function createGenerateSelectionInsightsUseCase(): GenerateSelectionInsightsUseCase {
  const port = createSelectionInsightAdapter();
  return new GenerateSelectionInsightsUseCase(port);
}
