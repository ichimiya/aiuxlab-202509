import { createResearchRepository } from "@/shared/infrastructure/redis/researchRepository";
import { createResearchIdGenerator } from "@/shared/infrastructure/research/idGenerator";
import { createResearchEventPublisher } from "@/shared/infrastructure/events/researchEventHub";
import { createSystemClock } from "@/shared/infrastructure/research/systemClock";
import { createResearchExecutionJobPort } from "@/shared/infrastructure/research/jobQueue";
import { createExecuteResearchUseCase } from "@/shared/useCases/ExecuteResearchUseCase";
import { createCreateResearchUseCase } from "@/shared/useCases/CreateResearchUseCase";
import { createReExecuteResearchUseCase } from "@/shared/useCases/ReExecuteResearchUseCase";
import { ProcessResearchJob } from "@/shared/useCases/ProcessResearchJob";
import type {
  ResearchEventPublisherPort,
  ResearchExecutionJobPort,
  ResearchIdGeneratorPort,
  ResearchPersistencePort,
  SystemClockPort,
} from "@/shared/useCases/ports/research";

interface BuildResearchContextOptions {
  apiKey: string;
}

interface ResearchContext {
  persistence: ResearchPersistencePort;
  idGenerator: ResearchIdGeneratorPort;
  eventPublisher: ResearchEventPublisherPort;
  jobPort: ResearchExecutionJobPort;
  clock: SystemClockPort;
}

let sharedContext: ResearchContext | undefined;

function buildContext(options: BuildResearchContextOptions): ResearchContext {
  if (sharedContext) {
    return sharedContext;
  }

  const persistence = createResearchRepository();
  const eventPublisher = createResearchEventPublisher();
  const clock = createSystemClock();
  const idGenerator = createResearchIdGenerator();
  const executeUseCase = createExecuteResearchUseCase(options.apiKey);
  const processJob = new ProcessResearchJob({
    persistence,
    eventPublisher,
    executeResearchUseCase: executeUseCase,
    clock,
  });
  const jobPort = createResearchExecutionJobPort({ processJob });

  sharedContext = {
    persistence,
    eventPublisher,
    jobPort,
    idGenerator,
    clock,
  };

  return sharedContext;
}

export function buildCreateResearchUseCase(
  options: BuildResearchContextOptions,
) {
  const context = buildContext(options);
  return createCreateResearchUseCase({
    persistence: context.persistence,
    eventPublisher: context.eventPublisher,
    idGenerator: context.idGenerator,
    jobPort: context.jobPort,
    clock: context.clock,
  });
}

export function buildReExecuteResearchUseCase(
  options: BuildResearchContextOptions,
) {
  const context = buildContext(options);
  return createReExecuteResearchUseCase({
    persistence: context.persistence,
    eventPublisher: context.eventPublisher,
    jobPort: context.jobPort,
    clock: context.clock,
  });
}
