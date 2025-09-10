import type { VoicePattern } from "@/shared/api/generated/models/voicePattern";

export interface ResearchContext {
  query: string;
  selectedText?: string;
  voiceCommand?: VoicePattern;
  researchId?: string;
}

export interface PerplexitySearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

export interface ChatChoiceMessage {
  role: "assistant" | "system" | "user";
  content: string;
  refusal?: string | null;
}

export interface ChatChoice {
  index: number;
  message: ChatChoiceMessage;
  finish_reason?: string | null;
  logprobs?: unknown;
}

export interface PerplexityResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  search_results?: PerplexitySearchResult[];
  related_questions?: string[];
}

export interface IResearchAPIRepository {
  search(context: ResearchContext): Promise<PerplexityResponse>;
}
