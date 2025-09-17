import type {
  VoiceEventQueuePort,
  VoiceEventJob,
  VoiceSessionStorePort,
  VoiceSessionState,
  VoiceNotificationPort,
  VoiceSseEvent,
  VoiceIntentClassifierPort,
  VoiceIntentInput,
  VoiceIntentResult,
} from "@/shared/useCases/ports/voice";

export class InMemoryVoiceEventQueue implements VoiceEventQueuePort {
  private queue: VoiceEventJob[] = [];
  private processing = false;

  constructor(
    private readonly worker: (job: VoiceEventJob) => Promise<void> | void,
  ) {}

  async enqueue(job: VoiceEventJob): Promise<void> {
    this.queue.push(job);
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift()!;
        await this.worker(next);
      }
    } finally {
      this.processing = false;
    }
  }
}

export class InMemoryVoiceSessionStore implements VoiceSessionStorePort {
  private readonly store = new Map<string, VoiceSessionState>();

  async get(sessionId: string): Promise<VoiceSessionState | null> {
    return this.store.get(sessionId) ?? null;
  }

  async set(session: VoiceSessionState): Promise<void> {
    this.store.set(session.sessionId, JSON.parse(JSON.stringify(session)));
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }
}

export class DelegateVoiceIntentClassifier
  implements VoiceIntentClassifierPort
{
  constructor(
    private readonly delegate: (
      input: VoiceIntentInput,
    ) => Promise<VoiceIntentResult>,
  ) {}

  classify(input: VoiceIntentInput): Promise<VoiceIntentResult> {
    return this.delegate(input);
  }
}

export class InMemoryVoiceNotificationAdapter implements VoiceNotificationPort {
  private listeners = new Set<(event: VoiceSseEvent) => void>();

  subscribe(listener: (event: VoiceSseEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(event: VoiceSseEvent): Promise<void> {
    this.listeners.forEach((listener) => listener(event));
  }
}
