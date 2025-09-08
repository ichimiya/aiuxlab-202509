import type {
  ContentProcessingInput,
  ContentProcessingOutput,
} from "@/shared/ai/schemas/contentProcessing";

export type { ContentProcessingInput, ContentProcessingOutput };

/**
 * Outbound Port: Content Processing
 * アプリケーション層が所有する外向きポート。
 * Provider差はAdapterで吸収する。
 */
export interface ContentProcessingPort {
  process(input: ContentProcessingInput): Promise<ContentProcessingOutput>;
}
