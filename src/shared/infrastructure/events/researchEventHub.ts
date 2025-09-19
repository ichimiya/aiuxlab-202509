import { EventEmitter } from "node:events";
import type {
  ResearchEvent,
  ResearchEventPublisherPort,
  ResearchEventSubscriberPort,
} from "@/shared/useCases/ports/research";

const CHANNEL_PREFIX = "research:";
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function channelId(researchId: string): string {
  return `${CHANNEL_PREFIX}${researchId}`;
}

export function createResearchEventPublisher(): ResearchEventPublisherPort {
  return {
    async publish(event: ResearchEvent) {
      emitter.emit(channelId(event.id), event);
    },
  };
}

export function createResearchEventSubscriber(): ResearchEventSubscriberPort {
  return {
    subscribe(researchId, listener) {
      const channel = channelId(researchId);
      emitter.on(channel, listener);
      return () => {
        emitter.off(channel, listener);
      };
    },
  };
}
