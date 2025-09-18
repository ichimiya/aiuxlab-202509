import type {
  ResearchEvent,
  ResearchEventPublisherPort,
  ResearchPersistencePort,
  ResearchResultSnapshot,
  ResearchSearchResultSnapshot,
  SystemClockPort,
} from "@/shared/useCases/ports/research";
import type { ExecuteResearchUseCase } from "@/shared/useCases/ExecuteResearchUseCase";
import type { VoicePattern } from "@/shared/api/generated/models";
import type {
  ResearchResult,
  SearchResult,
} from "@/shared/api/generated/models";

interface ProcessResearchJobDeps {
  persistence: ResearchPersistencePort;
  eventPublisher: ResearchEventPublisherPort;
  executeResearchUseCase: ExecuteResearchUseCase;
  clock: SystemClockPort;
}

interface ProcessResearchJobPayload {
  researchId: string;
}

export class ProcessResearchJob {
  constructor(private readonly deps: ProcessResearchJobDeps) {}

  async handle(payload: ProcessResearchJobPayload): Promise<void> {
    const snapshot = await this.deps.persistence.getSnapshot(
      payload.researchId,
    );
    if (!snapshot) {
      return;
    }

    try {
      const research = await this.deps.executeResearchUseCase.execute({
        query: snapshot.query,
        selectedText: snapshot.selectedText ?? undefined,
        voiceCommand: snapshot.voiceCommand as VoicePattern | undefined,
        researchId: snapshot.id,
      });

      const updated = await this.deps.persistence.updateSnapshot({
        id: snapshot.id,
        status: research.status ?? "completed",
        results: mapResultsToSnapshot(research.results ?? []),
        searchResults: mapSearchResultsToSnapshot(research.searchResults ?? []),
        citations: research.citations ?? [],
        updatedAt: this.deps.clock.now(),
        lastError: null,
      });

      await this.publishEvent({
        id: updated.id,
        revision: updated.revision,
        type: "status",
        payload: { status: updated.status },
        createdAt: updated.updatedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const updated = await this.deps.persistence.updateSnapshot({
        id: snapshot.id,
        status: "failed",
        results: [],
        searchResults: [],
        citations: [],
        updatedAt: this.deps.clock.now(),
        lastError: { message },
      });

      const errorEvent: ResearchEvent = {
        id: updated.id,
        revision: updated.revision,
        type: "error",
        payload: { message },
        createdAt: updated.updatedAt,
      };

      await this.deps.persistence.appendEvent(errorEvent);
      await this.deps.eventPublisher.publish(errorEvent);
    }
  }

  private async publishEvent(event: ResearchEvent) {
    await this.deps.eventPublisher.publish(event);
  }
}

function mapResultsToSnapshot(
  results: ResearchResult[],
): ResearchResultSnapshot[] {
  return results.map((result) => ({
    id: result.id,
    content: result.content,
    source: result.source,
    relevanceScore: result.relevanceScore ?? 1,
    processedCitations: result.processedCitations?.map((citation) => ({
      id: citation.id,
      number: citation.number,
      url: citation.url,
      title: citation.title ?? undefined,
      domain: citation.domain ?? undefined,
    })),
  }));
}

function mapSearchResultsToSnapshot(
  results: SearchResult[],
): ResearchSearchResultSnapshot[] {
  return results.map((result, index) => ({
    id: `search-${index + 1}`,
    title: result.title,
    url: result.url,
    snippet: result.snippet ?? "",
    lastUpdated: result.last_updated ?? undefined,
  }));
}
