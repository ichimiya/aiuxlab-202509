import type {
  ResearchEventPublisherPort,
  ResearchExecutionJobPort,
  ResearchPersistencePort,
  ResearchSnapshot,
  SystemClockPort,
} from "@/shared/useCases/ports/research";

export interface ReExecuteResearchUseCaseInput {
  researchId: string;
}

export interface ReExecuteResearchUseCaseDeps {
  persistence: ResearchPersistencePort;
  jobPort: ResearchExecutionJobPort;
  eventPublisher: ResearchEventPublisherPort;
  clock: SystemClockPort;
}

export class ReExecuteResearchUseCase {
  constructor(private readonly deps: ReExecuteResearchUseCaseDeps) {}

  async execute(
    input: ReExecuteResearchUseCaseInput,
  ): Promise<ResearchSnapshot> {
    const existing = await this.deps.persistence.getSnapshot(input.researchId);
    if (!existing) {
      throw new Error(`Research ${input.researchId} not found`);
    }

    const timestamp = this.deps.clock.now();

    const updated = await this.deps.persistence.updateSnapshot({
      id: existing.id,
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      updatedAt: timestamp,
      lastError: null,
    });

    await this.deps.jobPort.enqueue({
      researchId: existing.id,
      trigger: "re-execute",
    });

    await this.deps.eventPublisher.publish({
      id: updated.id,
      revision: updated.revision,
      type: "status",
      payload: { status: updated.status },
      createdAt: updated.updatedAt,
    });

    return updated;
  }
}

export function createReExecuteResearchUseCase(
  deps: ReExecuteResearchUseCaseDeps,
): ReExecuteResearchUseCase {
  return new ReExecuteResearchUseCase(deps);
}
