import type {
  ResearchEvent,
  ResearchEventSubscriberPort,
  ResearchPersistencePort,
} from "@/shared/useCases/ports/research";
import { createResearchRepository } from "@/shared/infrastructure/redis/researchRepository";
import { createResearchEventSubscriber } from "./researchEventHub";

const encoder = new TextEncoder();

function serializeEvent(event: ResearchEvent): Uint8Array {
  const payload = `id: ${event.revision}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload ?? {})}\n\n`;
  return encoder.encode(payload);
}

function serializeComment(): Uint8Array {
  return encoder.encode(`:\n\n`);
}

async function streamBacklog(
  controller: ReadableStreamDefaultController<Uint8Array>,
  persistence: ResearchPersistencePort,
  researchId: string,
  lastRevision: number,
) {
  const events = await persistence.getEventsSince(researchId, lastRevision);
  for (const event of events) {
    controller.enqueue(serializeEvent(event));
  }
}

export function createResearchEventStream(params: {
  researchId: string;
  lastEventId?: string | null;
  persistence?: ResearchPersistencePort;
  subscriber?: ResearchEventSubscriberPort;
}): Response {
  const persistence = params.persistence ?? createResearchRepository();
  const subscriber = params.subscriber ?? createResearchEventSubscriber();
  const fromRevision = params.lastEventId
    ? Number.parseInt(params.lastEventId, 10) || 0
    : 0;

  let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await streamBacklog(
        controller,
        persistence,
        params.researchId,
        fromRevision,
      );

      unsubscribe = subscriber.subscribe(params.researchId, (event) => {
        controller.enqueue(serializeEvent(event));
      });

      keepAliveTimer = setInterval(() => {
        controller.enqueue(serializeComment());
      }, 15000);
    },
    cancel() {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      connection: "keep-alive",
      "cache-control": "no-cache, no-transform",
    },
  });
}
