import type { ResearchEvent } from "./persistence";

export type ResearchJobTrigger = "create" | "re-execute";

export interface ResearchIdGeneratorPort {
  generate(): string;
}

export interface ResearchExecutionJobPort {
  enqueue(job: {
    researchId: string;
    trigger: ResearchJobTrigger;
  }): Promise<void>;
}

export interface ResearchEventPublisherPort {
  publish(event: ResearchEvent): Promise<void>;
}

export interface ResearchEventSubscriberPort {
  subscribe(
    researchId: string,
    listener: (event: ResearchEvent) => void,
  ): () => void;
}

export interface SystemClockPort {
  now(): string;
}

export type { ResearchPersistencePort } from "./persistence";
export type {
  AppendEventInput,
  ResearchEvent,
  ResearchEventType,
  ResearchResultSnapshot,
  ResearchSearchResultSnapshot,
  ResearchSnapshot,
  ResearchStatus,
  SaveInitialSnapshotInput,
  UpdateSnapshotInput,
} from "./persistence";
