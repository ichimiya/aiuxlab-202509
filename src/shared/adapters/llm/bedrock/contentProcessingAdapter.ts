import { BaseBedrockClient } from "@/shared/infrastructure/clients/bedrock/BedrockClient";
import { buildContentProcessingPrompt } from "@/shared/ai/prompts/contentProcessing";
import type { ContentProcessingPort } from "@/shared/useCases/ports/contentProcessing";
import type {
  ContentProcessingInput,
  ContentProcessingOutput,
} from "@/shared/ai/schemas/contentProcessing";

export class BedrockContentProcessingAdapter
  extends BaseBedrockClient
  implements ContentProcessingPort
{
  async process(
    input: ContentProcessingInput,
  ): Promise<ContentProcessingOutput> {
    const prompt = buildContentProcessingPrompt(input);
    const text = await this.invokePrompt(prompt);

    // 期待は厳密JSON。LLM出力の揺れに対し緩やかにパースしてフォールバック
    let htmlContent = "";
    let processedCitations: ContentProcessingOutput["processedCitations"] = [];
    try {
      // ```json ブロック対応含む
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) jsonMatch = [codeBlockMatch[1]];
      }
      const parsed = JSON.parse((jsonMatch?.[0] || text) as string);
      htmlContent = parsed.htmlContent || text;
      processedCitations = Array.isArray(parsed.processedCitations)
        ? parsed.processedCitations
        : [];
    } catch {
      htmlContent = text;
      processedCitations = [];
    }

    return { htmlContent, processedCitations };
  }
}
