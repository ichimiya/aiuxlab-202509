import { BaseBedrockClient } from "@/shared/infrastructure/clients/bedrock/BedrockClient";
import {
  buildSelectionInsightTopicPrompt,
  buildSelectionInsightExpansionPrompt,
} from "@/shared/ai/prompts/selectionInsights";
import type {
  SelectionInsightPort,
  SelectionInsightRequest,
  SelectionInsightResult,
} from "@/shared/useCases/ports/selectionInsights";
import {
  SelectionInsightResultSchema,
  SelectionInsightTopicListSchema,
} from "@/shared/ai/schemas/selectionInsights";

const MAX_TOPICS = 2;

export class BedrockSelectionInsightAdapter
  extends BaseBedrockClient
  implements SelectionInsightPort
{
  async generate(
    request: SelectionInsightRequest,
  ): Promise<SelectionInsightResult> {
    const topicPrompt = buildSelectionInsightTopicPrompt({
      researchId: request.researchId,
      selection: request.selection,
      requestedTopics: MAX_TOPICS,
    });

    const topicsText = await this.invokePrompt(topicPrompt);
    const topicsPayload = parseJson(topicsText);
    const topicList = SelectionInsightTopicListSchema.parse(topicsPayload);
    const selectedTopics = topicList.topics.slice(0, MAX_TOPICS);

    const expansionPrompt = buildSelectionInsightExpansionPrompt({
      researchId: request.researchId,
      selection: request.selection,
      topics: selectedTopics,
    });

    const insightsText = await this.invokePrompt(expansionPrompt);
    const insightsPayload = parseJson(insightsText);
    const parsed = SelectionInsightResultSchema.parse(insightsPayload);

    return {
      ...parsed,
      insights: parsed.insights.map((insight) => ({
        ...insight,
        keyPoints: insight.keyPoints ?? [],
        recommendedSources: insight.recommendedSources ?? [],
      })),
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    };
  }
}

function parseJson(text: string): unknown {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch?.[1]) {
    return JSON.parse(codeBlockMatch[1]);
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return JSON.parse(objectMatch[0]);
  }

  return JSON.parse(text);
}
