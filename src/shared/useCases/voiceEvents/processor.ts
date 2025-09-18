import { createOptimizeQueryUseCase } from "@/shared/useCases";
import { createQueryOptimizationSessionRepository } from "@/shared/infrastructure/redis/queryOptimizationSessionRepository";
import { getVoiceNotificationAdapter } from "@/shared/infrastructure/voice/notificationGateway";
import { getVoiceSessionStore } from "@/shared/infrastructure/voice/sessionStore";
import type {
  VoiceEventJob,
  VoiceSessionState,
  VoiceNotificationPort,
  VoiceSessionStorePort,
} from "@/shared/useCases/ports/voice";
import type { QueryOptimizationSessionEntry } from "@/shared/domain/queryOptimization/services";
import type { VoicePattern } from "@/shared/api/generated/models";
import { VoicePattern as VoicePatternEnum } from "@/shared/api/generated/models/voicePattern";
import type { QueryOptimizationSessionRepository } from "@/shared/infrastructure/redis/queryOptimizationSessionRepository";
import type { OptimizeQueryUseCase } from "@/shared/useCases/OptimizeQueryUseCase";

const SESSION_TTL_SECONDS = 600;

function isVoicePattern(
  value: string | null | undefined,
): value is VoicePattern {
  if (!value) return false;
  return Object.values(VoicePatternEnum).includes(value as VoicePattern);
}

function selectBaselineQuery(
  history: QueryOptimizationSessionEntry[],
): string | null {
  const last = history.at(-1);
  if (!last) return null;
  const selectedCandidateId =
    last.result?.selectedCandidateId ?? last.result?.recommendedCandidateId;
  if (selectedCandidateId) {
    const candidate = last.result?.candidates?.find(
      (item) => item.id === selectedCandidateId,
    );
    if (candidate?.query) {
      return candidate.query;
    }
  }
  return last.request.originalQuery ?? null;
}

function sanitizeTranscript(transcript: string): string {
  return transcript.replace(/[\s]+/g, " ").trim();
}

function mergeQuery(
  history: QueryOptimizationSessionEntry[],
  transcript: string,
): { query: string; base: string } {
  const baseCandidate = selectBaselineQuery(history);
  const normalizedTranscript = sanitizeTranscript(transcript);

  if (!baseCandidate) {
    return {
      query: normalizedTranscript,
      base: normalizedTranscript,
    };
  }

  if (!normalizedTranscript) {
    return {
      query: baseCandidate,
      base: baseCandidate,
    };
  }

  const lowerBase = baseCandidate.toLowerCase();
  const lowerNew = normalizedTranscript.toLowerCase();

  if (lowerBase.includes(lowerNew)) {
    return {
      query: baseCandidate,
      base: baseCandidate,
    };
  }

  const merged = `${baseCandidate} ${normalizedTranscript}`.trim();
  return {
    query: merged,
    base: baseCandidate,
  };
}

function buildOptimizingState(
  sessionId: string,
  currentQuery: string,
  latestTranscript: string,
): VoiceSessionState {
  return {
    sessionId,
    status: "optimizing",
    candidates: [],
    selectedCandidateId: undefined,
    currentQuery,
    latestTranscript,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export interface VoiceEventProcessorDeps {
  optimizeUseCase: Pick<OptimizeQueryUseCase, "execute">;
  sessionRepository: Pick<
    QueryOptimizationSessionRepository,
    "getSessionHistory" | "initializeSession" | "appendEntry"
  >;
  notificationAdapter: Pick<VoiceNotificationPort, "publish">;
  sessionStore: Pick<VoiceSessionStorePort, "set">;
}

export function createVoiceEventProcessor({
  optimizeUseCase,
  sessionRepository,
  notificationAdapter,
  sessionStore,
}: VoiceEventProcessorDeps) {
  return async function processVoiceEventInternal(
    job: VoiceEventJob,
  ): Promise<void> {
    const history = await sessionRepository.getSessionHistory(job.sessionId);
    const { query: mergedQuery } = mergeQuery(history, job.transcript);

    const voiceCommand = isVoicePattern(job.pattern)
      ? (job.pattern as VoicePattern)
      : undefined;

    const optimizingState = buildOptimizingState(
      job.sessionId,
      mergedQuery,
      job.transcript,
    );
    await sessionStore.set(optimizingState);
    await notificationAdapter.publish({
      type: "session_update",
      sessionId: job.sessionId,
      payload: optimizingState,
    });

    try {
      const result = await optimizeUseCase.execute({
        originalQuery: mergedQuery,
        voiceTranscript: job.transcript,
        voiceCommand,
        sessionId: job.sessionId,
        sessionHistory: history,
      });

      const sessionEntry: QueryOptimizationSessionEntry = {
        request: {
          originalQuery: mergedQuery,
          voiceTranscript: job.transcript,
          voiceCommand,
        },
        result: {
          selectedCandidateId: result.recommendedCandidateId,
          recommendedCandidateId: result.recommendedCandidateId,
          candidates: result.candidates,
        },
      };

      if (history.length === 0) {
        await sessionRepository.initializeSession(
          job.sessionId,
          sessionEntry,
          SESSION_TTL_SECONDS,
        );
      } else {
        await sessionRepository.appendEntry(
          job.sessionId,
          sessionEntry,
          SESSION_TTL_SECONDS,
        );
      }

      const voiceSessionState: VoiceSessionState = {
        sessionId: job.sessionId,
        status: "ready",
        candidates: (result.candidates ?? []).map((candidate, index) => ({
          ...candidate,
          rank: index + 1,
          source: "llm" as const,
        })),
        selectedCandidateId:
          result.recommendedCandidateId ?? result.candidates?.[0]?.id,
        currentQuery: mergedQuery,
        latestTranscript: job.transcript,
        evaluationSummary: result.evaluationSummary ?? undefined,
        lastUpdatedAt: new Date().toISOString(),
      };

      await sessionStore.set(voiceSessionState);
      await notificationAdapter.publish({
        type: "session_update",
        sessionId: job.sessionId,
        payload: voiceSessionState,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "音声イベントの処理に失敗しました";
      await notificationAdapter.publish({
        type: "error",
        sessionId: job.sessionId,
        payload: { message },
      });
      throw error;
    }
  };
}

let cachedProcessor: ((job: VoiceEventJob) => Promise<void>) | null = null;

function getVoiceEventProcessorInternal() {
  if (!cachedProcessor) {
    cachedProcessor = createVoiceEventProcessor({
      optimizeUseCase: createOptimizeQueryUseCase(),
      sessionRepository: createQueryOptimizationSessionRepository(),
      notificationAdapter: getVoiceNotificationAdapter(),
      sessionStore: getVoiceSessionStore(),
    });
  }
  return cachedProcessor;
}

export async function processVoiceEvent(job: VoiceEventJob): Promise<void> {
  const processor = getVoiceEventProcessorInternal();
  return processor(job);
}
