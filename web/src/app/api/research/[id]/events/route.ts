import { NextRequest } from "next/server";
import { createResearchEventStream } from "@/shared/infrastructure/events/researchEventStream";
import { createResearchRepository } from "@/shared/infrastructure/redis/researchRepository";
import { createResearchEventSubscriber } from "@/shared/infrastructure/events/researchEventHub";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const lastEventId =
    request.headers.get("last-event-id") ??
    request.headers.get("Last-Event-ID") ??
    undefined;

  return createResearchEventStream({
    researchId: id,
    lastEventId,
    persistence: createResearchRepository(),
    subscriber: createResearchEventSubscriber(),
  });
}
