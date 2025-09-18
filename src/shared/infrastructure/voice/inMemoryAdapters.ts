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
  private readonly sessionQueues = new Map<
    string,
    Array<{
      job: VoiceEventJob;
      resolve: () => void;
      reject: (error: unknown) => void;
    }>
  >();
  private readonly processingSessions = new Set<string>();

  constructor(
    private readonly worker: (job: VoiceEventJob) => Promise<void> | void,
  ) {}

  enqueue(job: VoiceEventJob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const queued = this.sessionQueues.get(job.sessionId);
      if (queued) {
        queued.push({ job, resolve, reject });
      } else {
        this.sessionQueues.set(job.sessionId, [{ job, resolve, reject }]);
      }

      void this.processSession(job.sessionId);
    });
  }

  private async processSession(sessionId: string): Promise<void> {
    if (this.processingSessions.has(sessionId)) return;
    const queue = this.sessionQueues.get(sessionId);
    if (!queue || queue.length === 0) return;

    this.processingSessions.add(sessionId);
    try {
      while (queue.length > 0) {
        const task = queue[0];
        try {
          await this.worker(task.job);
          task.resolve();
        } catch (error) {
          task.reject(error);
        } finally {
          queue.shift();
        }
      }
    } finally {
      this.processingSessions.delete(sessionId);
      if (queue.length === 0) {
        this.sessionQueues.delete(sessionId);
      }
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
