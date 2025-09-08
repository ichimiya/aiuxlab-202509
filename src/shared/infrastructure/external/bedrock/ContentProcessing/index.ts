/**
 * Bedrock API Infrastructure - Content Processing
 */
import { BaseBedrockClient } from "../base/BedrockClient";
import { buildContentProcessingPrompt } from "@/shared/ai/prompts/contentProcessing";

export interface BedrockConfig {
  region?: string;
  modelId?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface ContentProcessingRequest {
  markdownContent: string;
  citations: string[];
  searchResults: Array<{ title: string; url: string }>;
}

export interface BedrockResponse {
  content: Array<{
    text: string;
  }>;
}

export class BedrockAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BedrockAPIError";
  }
}

export interface IContentProcessingRepository {
  processContent(request: ContentProcessingRequest): Promise<string>;
}

export class BedrockContentProcessingClient
  extends BaseBedrockClient
  implements IContentProcessingRepository
{
  async processContent(request: ContentProcessingRequest): Promise<string> {
    if (!request.markdownContent?.trim()) {
      throw new BedrockAPIError("Markdown content is required");
    }

    try {
      const prompt = this.buildPrompt(request);
      const text = await this.invokePrompt(prompt);
      return text;
    } catch (error) {
      if (error instanceof Error) {
        throw new BedrockAPIError(`Bedrock API error: ${error.message}`);
      }
      throw new BedrockAPIError("Network error: Unknown error");
    }
  }

  private buildPrompt(request: ContentProcessingRequest): string {
    return buildContentProcessingPrompt({
      markdown: request.markdownContent,
      citations: request.citations,
      searchResults: request.searchResults,
    });
  }
}

// 互換エイリアス（旧名）
// 互換エイリアスは現在は提供しない（明確な命名に統一）
