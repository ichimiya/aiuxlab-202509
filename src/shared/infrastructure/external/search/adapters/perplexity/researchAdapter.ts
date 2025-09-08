import type {
  IResearchAPIRepository,
  PerplexityResponse,
  ResearchContext,
} from "@/shared/infrastructure/external/perplexity";
import { PerplexityResearchClient } from "@/shared/infrastructure/external/perplexity";

export class PerplexityResearchAdapter implements IResearchAPIRepository {
  private inner: PerplexityResearchClient;
  constructor(cfg: { apiKey: string; model?: string; baseUrl?: string }) {
    this.inner = new PerplexityResearchClient(cfg);
  }
  search(context: ResearchContext): Promise<PerplexityResponse> {
    return this.inner.search(context);
  }
}
