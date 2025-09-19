import {
  createExecuteResearchUseCase,
  createOptimizeQueryUseCase,
} from "@/shared/useCases";
import { createQueryOptimizationSessionRepository } from "@/shared/infrastructure/redis/queryOptimizationSessionRepository";
import { getVoiceNotificationAdapter } from "@/shared/infrastructure/voice/notificationGateway";
import { getVoiceSessionStore } from "@/shared/infrastructure/voice/sessionStore";
import { getVoiceIntentClassifier } from "@/shared/infrastructure/voice/intentClassifier";
import type {
  VoiceEventJob,
  VoiceSessionState,
  VoiceNotificationPort,
  VoiceSessionStorePort,
  VoiceIntentClassifierPort,
  VoiceIntentResult,
} from "@/shared/useCases/ports/voice";
import { VOICE_INTENT_IDS } from "@/shared/domain/voice/intents";
import type { QueryOptimizationSessionEntry } from "@/shared/domain/queryOptimization/services";
import type { VoicePattern } from "@/shared/api/generated/models";
import { VoicePattern as VoicePatternEnum } from "@/shared/api/generated/models/voicePattern";
import type { QueryOptimizationSessionRepository } from "@/shared/infrastructure/redis/queryOptimizationSessionRepository";
import type { OptimizeQueryUseCase } from "@/shared/useCases/OptimizeQueryUseCase";
import type { ExecuteResearchUseCase } from "@/shared/useCases/ExecuteResearchUseCase";

const SESSION_TTL_SECONDS = 600;
const PENDING_INTENT_TTL_MS = 45_000;

const INTENT_CONFIDENCE_THRESHOLDS: Record<
  string,
  { auto: number; confirm: number }
> = {
  OPTIMIZE_QUERY_APPEND: { auto: 0.6, confirm: 0.4 },
  OPTIMIZE_QUERY_REPLACE: { auto: 0.65, confirm: 0.45 },
  CONFIRM_CANDIDATE_SELECTION: { auto: 0.7, confirm: 0.5 },
  START_RESEARCH: { auto: 0.8, confirm: 0.6 },
  CANCEL_OPTIMIZATION: { auto: 0.7, confirm: 0.4 },
};

const DEFAULT_CONFIDENCE_THRESHOLDS = { auto: 0.7, confirm: 0.5 } as const;
const SUPPORTED_AUTOMATIC_INTENTS = new Set([
  "OPTIMIZE_QUERY_APPEND",
  "OPTIMIZE_QUERY_REPLACE",
]);

type ConfidenceBand = "auto" | "confirm" | "reject";

function evaluateConfidenceBand(
  intentId: string,
  confidence: number,
): ConfidenceBand {
  const thresholds =
    INTENT_CONFIDENCE_THRESHOLDS[intentId] ?? DEFAULT_CONFIDENCE_THRESHOLDS;
  if (confidence >= thresholds.auto) return "auto";
  if (confidence >= thresholds.confirm) return "confirm";
  return "reject";
}

function isoNow(): string {
  return new Date().toISOString();
}

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
  executeResearchUseCase?: Pick<ExecuteResearchUseCase, "execute">;
  sessionRepository: Pick<
    QueryOptimizationSessionRepository,
    "getSessionHistory" | "initializeSession" | "appendEntry"
  >;
  notificationAdapter: Pick<VoiceNotificationPort, "publish">;
  sessionStore: Pick<VoiceSessionStorePort, "get" | "set">;
  intentClassifier?: Pick<VoiceIntentClassifierPort, "classify">;
}

export function createVoiceEventProcessor({
  optimizeUseCase,
  executeResearchUseCase,
  sessionRepository,
  notificationAdapter,
  sessionStore,
  intentClassifier,
}: VoiceEventProcessorDeps) {
  async function notifyError(sessionId: string, error: unknown): Promise<void> {
    const message =
      error instanceof Error
        ? error.message
        : "音声イベントの処理に失敗しました";
    await notificationAdapter.publish({
      type: "error",
      sessionId,
      payload: { message },
    });
  }

  async function registerPendingIntent(opts: {
    job: VoiceEventJob;
    currentSession: VoiceSessionState | null;
    mergedQuery: string;
    classification: VoiceIntentResult;
  }): Promise<void> {
    const pendingIntent = {
      intentId: opts.classification.intentId,
      confidence: opts.classification.confidence,
      parameters: opts.classification.parameters ?? {},
      expiresAt: new Date(Date.now() + PENDING_INTENT_TTL_MS).toISOString(),
    };

    const baseState =
      opts.currentSession ??
      buildOptimizingState(
        opts.job.sessionId,
        opts.mergedQuery,
        opts.job.transcript,
      );

    const nextState: VoiceSessionState = {
      ...baseState,
      currentQuery: opts.mergedQuery || baseState.currentQuery,
      latestTranscript: opts.job.transcript,
      pendingIntent,
      lastUpdatedAt: isoNow(),
    };

    await sessionStore.set(nextState);
    await notificationAdapter.publish({
      type: "intent_confirmation",
      sessionId: opts.job.sessionId,
      payload: pendingIntent,
    });
  }

  async function runOptimizeFlow(opts: {
    job: VoiceEventJob;
    history: QueryOptimizationSessionEntry[];
    mergedQuery: string;
    voiceCommand: VoicePattern | undefined;
  }): Promise<void> {
    const optimizingState: VoiceSessionState = {
      ...buildOptimizingState(
        opts.job.sessionId,
        opts.mergedQuery,
        opts.job.transcript,
      ),
      lastUpdatedAt: isoNow(),
    };
    await sessionStore.set(optimizingState);
    await notificationAdapter.publish({
      type: "session_update",
      sessionId: opts.job.sessionId,
      payload: optimizingState,
    });

    try {
      const result = await optimizeUseCase.execute({
        originalQuery: opts.mergedQuery,
        voiceTranscript: opts.job.transcript,
        voiceCommand: opts.voiceCommand,
        sessionId: opts.job.sessionId,
        sessionHistory: opts.history,
      });

      const sessionEntry: QueryOptimizationSessionEntry = {
        request: {
          originalQuery: opts.mergedQuery,
          voiceTranscript: opts.job.transcript,
          voiceCommand: opts.voiceCommand,
        },
        result: {
          selectedCandidateId: result.recommendedCandidateId,
          recommendedCandidateId: result.recommendedCandidateId,
          candidates: result.candidates,
        },
      };

      if (opts.history.length === 0) {
        await sessionRepository.initializeSession(
          opts.job.sessionId,
          sessionEntry,
          SESSION_TTL_SECONDS,
        );
      } else {
        await sessionRepository.appendEntry(
          opts.job.sessionId,
          sessionEntry,
          SESSION_TTL_SECONDS,
        );
      }

      const voiceSessionState: VoiceSessionState = {
        sessionId: opts.job.sessionId,
        status: "ready",
        candidates: (result.candidates ?? []).map((candidate, index) => ({
          ...candidate,
          rank: index + 1,
          source: "llm" as const,
        })),
        selectedCandidateId:
          result.recommendedCandidateId ?? result.candidates?.[0]?.id,
        currentQuery: opts.mergedQuery,
        latestTranscript: opts.job.transcript,
        evaluationSummary: result.evaluationSummary ?? undefined,
        lastUpdatedAt: isoNow(),
      };

      await sessionStore.set(voiceSessionState);
      await notificationAdapter.publish({
        type: "session_update",
        sessionId: opts.job.sessionId,
        payload: voiceSessionState,
      });
    } catch (error) {
      await notifyError(opts.job.sessionId, error);
      throw error;
    }
  }

  async function runStartResearchFlow(opts: {
    job: VoiceEventJob;
    mergedQuery: string;
    voiceCommand: VoicePattern | undefined;
    classification: VoiceIntentResult;
    currentSession: VoiceSessionState | null;
  }): Promise<void> {
    if (!executeResearchUseCase) {
      await notifyError(
        opts.job.sessionId,
        new Error(
          "START_RESEARCH intent is not supported (dependency missing).",
        ),
      );
      return;
    }

    const baseState =
      opts.currentSession ??
      buildOptimizingState(
        opts.job.sessionId,
        opts.mergedQuery,
        opts.job.transcript,
      );

    const parameters = opts.classification.parameters ?? {};
    const candidateIdFromParams =
      typeof parameters.candidateId === "string"
        ? (parameters.candidateId as string)
        : undefined;

    const resolvedCandidateId =
      candidateIdFromParams ??
      baseState.selectedCandidateId ??
      baseState.candidates[0]?.id;

    const resolvedCandidate = resolvedCandidateId
      ? baseState.candidates.find(
          (candidate) => candidate.id === resolvedCandidateId,
        )
      : undefined;

    const queryFromParams =
      typeof parameters.query === "string" ? parameters.query : undefined;

    const queryForResearch =
      queryFromParams ??
      resolvedCandidate?.query ??
      baseState.currentQuery ??
      opts.mergedQuery;

    try {
      const research = await executeResearchUseCase.execute({
        query: queryForResearch,
        voiceCommand: opts.voiceCommand,
      });

      const nextState: VoiceSessionState = {
        ...baseState,
        status: "researching",
        selectedCandidateId: resolvedCandidateId,
        currentQuery: queryForResearch,
        latestTranscript: opts.job.transcript,
        pendingIntent: undefined,
        researchSessionId: research.id,
        lastUpdatedAt: isoNow(),
      };

      await sessionStore.set(nextState);
      await notificationAdapter.publish({
        type: "session_update",
        sessionId: opts.job.sessionId,
        payload: nextState,
      });
    } catch (error) {
      await notifyError(opts.job.sessionId, error);
      throw error;
    }
  }

  return async function processVoiceEventInternal(
    job: VoiceEventJob,
  ): Promise<void> {
    const [history, currentSession] = await Promise.all([
      sessionRepository.getSessionHistory(job.sessionId),
      sessionStore.get(job.sessionId),
    ]);

    const { query: mergedQuery } = mergeQuery(history, job.transcript);

    const defaultClassification: VoiceIntentResult = {
      intentId: "OPTIMIZE_QUERY_APPEND",
      confidence: 1,
      parameters: {},
    };

    const classification = intentClassifier
      ? await intentClassifier.classify({
          sessionId: job.sessionId,
          text: job.transcript,
          context: {
            confidence: job.confidence,
            isFinal: job.isFinal,
            metadata: job.metadata,
            session: currentSession,
            history: history.slice(-3),
            pattern: job.pattern,
          },
        })
      : defaultClassification;

    const normalizedIntentId = classification.intentId.toUpperCase();
    if (
      !VOICE_INTENT_IDS.includes(
        normalizedIntentId as (typeof VOICE_INTENT_IDS)[number],
      )
    ) {
      await notifyError(
        job.sessionId,
        new Error(`Unknown intentId received: ${normalizedIntentId}`),
      );
      return;
    }
    const confidenceBand = evaluateConfidenceBand(
      normalizedIntentId,
      classification.confidence,
    );

    const voiceCommand = isVoicePattern(job.pattern)
      ? (job.pattern as VoicePattern)
      : undefined;

    if (confidenceBand === "reject") {
      await notifyError(
        job.sessionId,
        new Error(
          `インテント「${normalizedIntentId}」の信頼度が不足しています (${classification.confidence.toFixed(2)})`,
        ),
      );
      return;
    }

    if (confidenceBand === "confirm") {
      if (normalizedIntentId === "START_RESEARCH") {
        await registerPendingIntent({
          job,
          currentSession,
          mergedQuery,
          classification: {
            intentId: normalizedIntentId,
            confidence: classification.confidence,
            parameters: classification.parameters ?? {},
          },
        });
        return;
      }

      await notifyError(
        job.sessionId,
        new Error(
          `Intent ${normalizedIntentId} is not implemented for confirm band`,
        ),
      );
      return;
    }

    if (normalizedIntentId === "START_RESEARCH") {
      await runStartResearchFlow({
        job,
        mergedQuery,
        voiceCommand,
        classification: {
          intentId: normalizedIntentId,
          confidence: classification.confidence,
          parameters: classification.parameters ?? {},
        },
        currentSession,
      });
      return;
    }

    if (SUPPORTED_AUTOMATIC_INTENTS.has(normalizedIntentId)) {
      await runOptimizeFlow({
        job,
        history,
        mergedQuery,
        voiceCommand,
      });
      return;
    }

    await notifyError(
      job.sessionId,
      new Error(
        `Intent ${normalizedIntentId} is not implemented for auto band`,
      ),
    );
  };
}

let cachedProcessor: ((job: VoiceEventJob) => Promise<void>) | null = null;

function getVoiceEventProcessorInternal() {
  if (!cachedProcessor) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    cachedProcessor = createVoiceEventProcessor({
      optimizeUseCase: createOptimizeQueryUseCase(),
      executeResearchUseCase: apiKey
        ? createExecuteResearchUseCase(apiKey)
        : undefined,
      sessionRepository: createQueryOptimizationSessionRepository(),
      notificationAdapter: getVoiceNotificationAdapter(),
      sessionStore: getVoiceSessionStore(),
      intentClassifier: getVoiceIntentClassifier(),
    });
  }
  return cachedProcessor;
}

export async function processVoiceEvent(job: VoiceEventJob): Promise<void> {
  const processor = getVoiceEventProcessorInternal();
  return processor(job);
}
