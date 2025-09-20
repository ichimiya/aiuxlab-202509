export type ResearchStatus = "pending" | "completed" | "failed";

export type ResearchEventType =
  | "status"
  | "snapshot"
  | "result-appended"
  | "error";

export interface ResearchResultSnapshot {
  id: string;
  content: string;
  source: string;
  relevanceScore: number;
  processedCitations?: Array<{
    id: string;
    number: number;
    url: string;
    title?: string;
    domain?: string;
  }>;
}

export interface ResearchSearchResultSnapshot {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  relevanceScore?: number;
  lastUpdated?: string;
}

export interface ResearchSnapshot {
  id: string;
  query: string;
  selectedText?: string | null;
  voiceCommand?: unknown;
  status: ResearchStatus;
  revision: number;
  results: ResearchResultSnapshot[];
  searchResults: ResearchSearchResultSnapshot[];
  citations: string[];
  createdAt: string;
  updatedAt: string;
  lastError?: {
    message: string;
    code?: string;
  } | null;
}

export interface SaveInitialSnapshotInput
  extends Omit<ResearchSnapshot, "revision" | "lastError"> {
  lastError?: ResearchSnapshot["lastError"];
}

export interface UpdateSnapshotInput {
  id: string;
  status?: ResearchStatus;
  results?: ResearchResultSnapshot[];
  searchResults?: ResearchSearchResultSnapshot[];
  citations?: string[];
  updatedAt: string;
  lastError?: ResearchSnapshot["lastError"];
}

export interface ResearchEvent {
  id: string;
  revision: number;
  type: ResearchEventType;
  payload: unknown;
  createdAt: string;
}

export interface AppendEventInput {
  id: string;
  revision: number;
  type: ResearchEventType;
  payload: unknown;
  createdAt: string;
}

export interface ResearchPersistencePort {
  saveInitialSnapshot(
    input: SaveInitialSnapshotInput,
  ): Promise<ResearchSnapshot>;
  updateSnapshot(input: UpdateSnapshotInput): Promise<ResearchSnapshot>;
  appendEvent(event: AppendEventInput): Promise<void>;
  getSnapshot(id: string): Promise<ResearchSnapshot | null>;
  getEventsSince(id: string, revision: number): Promise<ResearchEvent[]>;
}
