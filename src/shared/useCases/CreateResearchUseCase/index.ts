import type {
  ResearchEventPublisherPort,
  ResearchExecutionJobPort,
  ResearchIdGeneratorPort,
  ResearchPersistencePort,
  SystemClockPort,
} from "@/shared/useCases/ports/research";

export interface CreateResearchUseCaseInput {
  query: string;
  selectedText?: string | null;
  voiceCommand?: unknown;
}

export interface CreateResearchUseCaseDeps {
  persistence: ResearchPersistencePort;
  idGenerator: ResearchIdGeneratorPort;
  jobPort: ResearchExecutionJobPort;
  eventPublisher: ResearchEventPublisherPort;
  clock: SystemClockPort;
}

export interface CreateResearchUseCaseResult {
  id: string;
  status: "pending";
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export class CreateResearchUseCase {
  constructor(private readonly deps: CreateResearchUseCaseDeps) {}

  async execute(
    input: CreateResearchUseCaseInput,
  ): Promise<CreateResearchUseCaseResult> {
    const id = this.deps.idGenerator.generate();
    const timestamp = this.deps.clock.now();

    const snapshot = await this.deps.persistence.saveInitialSnapshot({
      id,
      query: input.query,
      selectedText: input.selectedText ?? null,
      voiceCommand: input.voiceCommand ?? null,
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastError: null,
    });

    await this.deps.jobPort.enqueue({ researchId: id, trigger: "create" });

    await this.deps.eventPublisher.publish({
      id,
      revision: snapshot.revision,
      type: "status",
      payload: { status: snapshot.status },
      createdAt: snapshot.updatedAt,
    });

    return {
      id,
      status: "pending",
      revision: snapshot.revision,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  }
}

export function createCreateResearchUseCase(
  deps: CreateResearchUseCaseDeps,
): CreateResearchUseCase {
  return new CreateResearchUseCase(deps);
}
