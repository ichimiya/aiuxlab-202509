import { PerplexityResearchAdapter } from "@/shared/adapters/search/perplexity/researchAdapter";

function provider(): string {
  return (process.env.SEARCH_PROVIDER || "perplexity").toLowerCase();
}

export function createResearchRepository(cfg: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}) {
  const p = provider();
  if (p === "perplexity") {
    return new PerplexityResearchAdapter(cfg);
  }
  // default fallback
  return new PerplexityResearchAdapter(cfg);
}
