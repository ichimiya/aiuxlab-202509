import { NextRequest, NextResponse } from "next/server";
import { getVoiceNotificationAdapter } from "@/shared/infrastructure/voice/notificationGateway";
import type { VoiceSseEvent } from "@/shared/useCases/ports/voice";

const encoder = new TextEncoder();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      {
        code: "MISSING_SESSION_ID",
        message: "sessionId query parameter is required",
      },
      { status: 400 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const adapter = getVoiceNotificationAdapter();

      const send = (event: VoiceSseEvent) => {
        const payload = event.payload ?? {};
        const lines = [
          `event: ${event.type}`,
          `id: ${event.sessionId}`,
          `data: ${JSON.stringify(payload)}`,
          "",
        ].join("\n");
        controller.enqueue(encoder.encode(`${lines}\n`));
      };

      // すぐに接続完了イベントを送信
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`,
        ),
      );

      const unsubscribe = adapter.subscribe(send);

      const closeStream = () => {
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", closeStream);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
