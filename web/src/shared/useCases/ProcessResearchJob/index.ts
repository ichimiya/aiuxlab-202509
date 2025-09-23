import type {
  ResearchEvent,
  ResearchEventPublisherPort,
  ResearchPersistencePort,
  ResearchResultSnapshot,
  ResearchSearchResultSnapshot,
  ResearchSnapshot,
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

      const mappedResults = mapResultsToSnapshot(research.results ?? []);
      const mappedSearchResults = mapSearchResultsToSnapshot(
        research.searchResults ?? [],
      );

      const updated = await this.deps.persistence.updateSnapshot({
        id: snapshot.id,
        status: research.status ?? "completed",
        results: mappedResults,
        searchResults: mappedSearchResults,
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

      await this.emitSnapshotEvent(updated);

      const existingResultIds = new Set(
        (snapshot.results ?? []).map((result) => result.id),
      );
      const appendedResults = mappedResults.filter(
        (result) => !existingResultIds.has(result.id),
      );

      for (const result of appendedResults) {
        const resultEvent: ResearchEvent = {
          id: updated.id,
          revision: updated.revision,
          type: "result-appended",
          payload: result,
          createdAt: updated.updatedAt,
        };
        await this.deps.persistence.appendEvent(resultEvent);
        await this.deps.eventPublisher.publish(resultEvent);
      }
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

  private async emitSnapshotEvent(snapshot: ResearchSnapshot) {
    const snapshotEvent: ResearchEvent = {
      id: snapshot.id,
      revision: snapshot.revision,
      type: "snapshot",
      payload: {
        status: snapshot.status,
        results: snapshot.results,
        searchResults: snapshot.searchResults,
        citations: snapshot.citations,
        updatedAt: snapshot.updatedAt,
        revision: snapshot.revision,
        lastError: snapshot.lastError,
      },
      createdAt: snapshot.updatedAt,
    };
    await this.deps.persistence.appendEvent(snapshotEvent);
    await this.deps.eventPublisher.publish(snapshotEvent);
  }
}

function mapResultsToSnapshot(
  results: ResearchResult[],
): ResearchResultSnapshot[] {
  return results.map((result) => ({
    id: result.id,
    content: result.content,
    htmlContent: result.htmlContent,
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
