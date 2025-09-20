import type {
  ResearchPersistencePort,
  ResearchSnapshot,
} from "@/shared/useCases/ports/research";

export interface GetResearchUseCaseDeps {
  persistence: ResearchPersistencePort;
}

export class GetResearchUseCase {
  constructor(private readonly deps: GetResearchUseCaseDeps) {}

  async execute(input: {
    researchId: string;
  }): Promise<ResearchSnapshot | null> {
    return this.deps.persistence.getSnapshot(input.researchId);
  }
}

export function createGetResearchUseCase(
  deps: GetResearchUseCaseDeps,
): GetResearchUseCase {
  return new GetResearchUseCase(deps);
}
