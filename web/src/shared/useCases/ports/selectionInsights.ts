import type { TextSelection } from "@/shared/stores/researchStore";
import type {
  SelectionInsightResult,
  SelectionInsight,
  SelectionInsightSource,
  SelectionInsightKeyPoint,
  SelectionInsightTopic,
} from "@/shared/ai/schemas/selectionInsights";

export type {
  SelectionInsightResult,
  SelectionInsight,
  SelectionInsightSource,
  SelectionInsightKeyPoint,
  SelectionInsightTopic,
} from "@/shared/ai/schemas/selectionInsights";

export interface SelectionInsightRequest {
  researchId: string;
  selection: TextSelection;
}

export interface SelectionInsightPort {
  generate(request: SelectionInsightRequest): Promise<SelectionInsightResult>;
}
