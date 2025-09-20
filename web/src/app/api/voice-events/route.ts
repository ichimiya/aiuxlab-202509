import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody, fail, ok } from "@/shared/api/http/http";
import { getVoiceEventQueue } from "@/shared/infrastructure/voice/eventQueue";
import type { VoiceEventJob } from "@/shared/useCases/ports/voice";

const voiceEventBody = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  transcript: z.string().min(1, "transcript is required"),
  confidence: z.number().min(0).max(1).optional(),
  isFinal: z.boolean().optional(),
  pattern: z.string().optional(),
  locale: z.string().optional(),
  device: z.string().optional(),
  chunkSeq: z.number().int().min(0),
  timestamp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request);
  if (parsed.status !== 200) {
    return parsed;
  }

  const body = await parsed.json();
  const validation = voiceEventBody.safeParse(body);
  if (!validation.success) {
    const first = validation.error.issues[0];
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: first?.message ?? "リクエストが不正です",
      },
      400,
    );
  }

  const data = validation.data;

  const job: VoiceEventJob = {
    sessionId: data.sessionId,
    transcript: data.transcript,
    confidence: data.confidence ?? 0,
    isFinal: data.isFinal ?? false,
    pattern: data.pattern,
    timestamp: data.timestamp ?? new Date().toISOString(),
    metadata: {
      locale: data.locale ?? "ja-JP",
      device: data.device ?? "web",
      chunkSeq: data.chunkSeq,
    },
  };

  try {
    const queue = getVoiceEventQueue();
    const enqueueResult = queue.enqueue(job);
    if (enqueueResult && typeof enqueueResult.catch === "function") {
      void enqueueResult.catch((error: unknown) => {
        console.error("Failed to process voice event", error);
      });
    }
    return ok({ accepted: true }, 202);
  } catch (error) {
    console.error("Voice event enqueue failed", error);
    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "音声イベントの処理に失敗しました",
      },
      500,
    );
  }
}
