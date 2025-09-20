import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createOptimizeQueryUseCase } from "@/shared/useCases";
import { optimizeQueryBody } from "@/shared/api/generated/zod";
import type {
  QueryOptimizationRequest,
  QueryOptimizationSessionEntry,
} from "@/shared/domain/queryOptimization/services";
import { parseJsonBody, fail, ok } from "@/shared/api/http/http";
import { createQueryOptimizationSessionRepository } from "@/shared/infrastructure/redis/queryOptimizationSessionRepository";

/**
 * クエリ最適化 API
 * POST /api/query-optimization
 */
export async function POST(request: NextRequest) {
  try {
    const sessionRepository = createQueryOptimizationSessionRepository();
    const SESSION_TTL_SECONDS = 600;

    // リクエストボディの解析（共通）
    const parsed = await parseJsonBody(request);
    if (parsed.status !== 200) return parsed;
    const requestBody = await parsed.json();

    // バリデーション
    const validation = optimizeQueryBody.safeParse(requestBody);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return fail(
        {
          code: "VALIDATION_ERROR",
          message: firstError?.message ?? "無効なリクエストです",
        },
        400,
      );
    }

    // ユースケース実行
    const useCase = createOptimizeQueryUseCase();
    const { userContext, voiceTranscript, sessionId, ...rest } =
      validation.data as typeof validation.data & {
        voiceTranscript?: string | null;
        sessionId?: string | null;
      };

    const resolvedSessionId = sessionId ?? randomUUID();
    let sessionHistory: QueryOptimizationSessionEntry[] | undefined;
    if (sessionId) {
      sessionHistory = await sessionRepository.getSessionHistory(sessionId);
      if (!Array.isArray(sessionHistory)) {
        sessionHistory = [];
      }
    }

    const normalized: QueryOptimizationRequest = {
      ...rest,
      voiceTranscript:
        typeof voiceTranscript === "string" && voiceTranscript.trim()
          ? voiceTranscript.trim()
          : undefined,
      userContext:
        (userContext as QueryOptimizationRequest["userContext"] | null) ??
        undefined,
      sessionId: resolvedSessionId,
      sessionHistory,
    };
    const result = await useCase.execute(normalized);

    const sessionEntry: QueryOptimizationSessionEntry = {
      request: {
        originalQuery: normalized.originalQuery,
        voiceTranscript: normalized.voiceTranscript,
        voiceCommand: normalized.voiceCommand,
      },
      result: {
        selectedCandidateId: result.recommendedCandidateId,
        candidates: result.candidates,
      },
    };

    if (!sessionId) {
      await sessionRepository.initializeSession(
        resolvedSessionId,
        sessionEntry,
        SESSION_TTL_SECONDS,
      );
    } else {
      await sessionRepository.appendEntry(
        resolvedSessionId,
        sessionEntry,
        SESSION_TTL_SECONDS,
      );
    }

    return ok({ sessionId: resolvedSessionId, result }, 200);
  } catch (error) {
    console.error("Query Optimization API error:", error);
    return fail(
      {
        code: "INTERNAL_ERROR",
        message: "クエリ最適化中にエラーが発生しました",
      },
      500,
    );
  }
}
