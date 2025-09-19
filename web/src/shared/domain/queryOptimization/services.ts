import type { Research, VoicePattern } from "@/shared/api/generated/models";

export interface OptimizationCandidate {
  id: string;
  query: string;
  coverageScore: number;
  coverageExplanation: string;
  addedAspects: string[];
  improvementReason: string;
  suggestedFollowups: string[];
}

export interface OptimizationResult {
  candidates: OptimizationCandidate[];
  evaluationSummary?: string;
  recommendedCandidateId?: string;
}

export interface QueryOptimizationSessionEntry {
  request: {
    originalQuery: string;
    voiceTranscript?: string;
    voiceCommand?: VoicePattern;
  };
  result?: {
    selectedCandidateId?: string;
    recommendedCandidateId?: string;
    candidates: OptimizationCandidate[];
  };
}

export interface QueryOptimizationRequest {
  originalQuery: string;
  selectedText?: string;
  voiceCommand?: VoicePattern;
  voiceTranscript?: string;
  researchHistory?: Research[];
  userContext?: {
    interests?: string[];
    expertise?: string[];
    previousOptimizations?: OptimizationResult[];
  };
  sessionId?: string;
  sessionHistory?: QueryOptimizationSessionEntry[];
}

export class QueryOptimizationDomainService {
  static readonly MAX_QUERY_LENGTH = 1000;

  static validateOriginalQuery(query: string): void {
    const q = (query ?? "").trim();
    if (!q) {
      throw new Error("Query must not be empty");
    }
    if (q.length > this.MAX_QUERY_LENGTH) {
      throw new Error("Query is too long");
    }
  }

  static buildContextSummary(req: QueryOptimizationRequest): string {
    const parts: string[] = [];

    if (req.selectedText && req.selectedText.trim()) {
      parts.push(`【選択テキスト】\n${req.selectedText.trim()}`);
    }

    if (req.voiceCommand) {
      parts.push(`【音声コマンド】${req.voiceCommand}`);
    }

    if (req.voiceTranscript && req.voiceTranscript.trim()) {
      parts.push(`【音声テキスト】${req.voiceTranscript.trim()}`);
    }

    const history = req.researchHistory ?? [];
    if (history.length > 0) {
      const recent = history
        .slice(-3)
        .map((h) => `- ${h.query}`)
        .join("\n");
      parts.push(`【履歴（最近${Math.min(history.length, 3)}件）】\n${recent}`);
    }

    const sessionHistory = req.sessionHistory ?? [];
    if (sessionHistory.length > 0) {
      const startIndex = Math.max(sessionHistory.length - 3, 0);
      const recentSessions = sessionHistory.slice(-3).map((entry, index) => {
        const stepNumber = startIndex + index + 1;
        const base = `#${stepNumber} ${entry.request.originalQuery}`;
        const selectedCandidateId =
          entry.result?.selectedCandidateId ??
          entry.result?.recommendedCandidateId;
        const candidate = entry.result?.candidates?.find(
          (c) => c.id === selectedCandidateId,
        );
        const chosen = candidate
          ? ` → 推奨案: ${candidate.query}`
          : selectedCandidateId
            ? ` → 推奨案ID: ${selectedCandidateId}`
            : "";
        return `${base}${chosen}`.trim();
      });
      parts.push(
        `【セッション履歴（最近${Math.min(sessionHistory.length, 3)}件）】\n${recentSessions.join("\n")}`,
      );
    }

    return parts.join("\n\n");
  }

  static formatOptimizationResult(
    result: OptimizationResult,
    options: { fallbackQuery?: string } = {},
  ): OptimizationResult {
    const normalizeCandidate = (
      candidate: Partial<OptimizationCandidate>,
      index: number,
    ): OptimizationCandidate | null => {
      const query = (candidate.query ?? "").trim();
      if (!query) return null;

      const assignedId =
        (candidate.id ?? "").trim() || `candidate-${index + 1}`;
      const clampedScore = Math.max(
        0,
        Math.min(1, Number(candidate.coverageScore ?? 0)),
      );
      const explanation = (candidate.coverageExplanation ?? "").trim();

      const seenAspects = new Set<string>();
      const dedupedAspects = (candidate.addedAspects ?? [])
        .map((aspect) => (aspect ?? "").trim())
        .filter((aspect) => {
          if (!aspect || seenAspects.has(aspect)) return false;
          seenAspects.add(aspect);
          return true;
        });

      const trimmedFollowups = (candidate.suggestedFollowups ?? [])
        .map((item) => (item ?? "").trim())
        .filter(Boolean);

      return {
        id: assignedId,
        query,
        coverageScore: clampedScore,
        coverageExplanation: explanation || "補足情報なし",
        addedAspects: dedupedAspects,
        improvementReason: (candidate.improvementReason ?? "").trim(),
        suggestedFollowups: trimmedFollowups,
      };
    };

    const normalized = (result.candidates ?? [])
      .map((candidate, index) => normalizeCandidate(candidate, index))
      .filter(
        (candidate): candidate is OptimizationCandidate => candidate !== null,
      );

    if (normalized.length === 0) {
      const fallbackQuery = (options.fallbackQuery ?? "").trim();
      if (!fallbackQuery) {
        throw new Error("No valid optimization candidates returned");
      }

      normalized.push({
        id: "candidate-1",
        query: fallbackQuery,
        coverageScore: 0.5,
        coverageExplanation: "LLM結果が空のため元クエリを補完",
        addedAspects: [],
        improvementReason: "入力クエリをそのまま返却",
        suggestedFollowups: [],
      });
    }

    normalized.sort((a, b) => b.coverageScore - a.coverageScore);

    const ensured = this.ensureCandidateCount(
      normalized,
      options.fallbackQuery,
    );

    const recommendedCandidateId =
      (result.recommendedCandidateId &&
      ensured.some((c) => c.id === result.recommendedCandidateId)
        ? result.recommendedCandidateId
        : ensured[0]?.id) ?? undefined;

    const evaluationSummary = (result.evaluationSummary ?? "").trim();

    return {
      candidates: ensured,
      evaluationSummary: evaluationSummary || undefined,
      recommendedCandidateId,
    };
  }

  private static ensureCandidateCount(
    candidates: OptimizationCandidate[],
    fallbackQuery?: string,
  ): OptimizationCandidate[] {
    if (candidates.length >= 3) {
      return candidates.slice(0, 3);
    }

    const padded: OptimizationCandidate[] = [...candidates];
    const base = candidates[0];
    const baseQuery = base?.query ?? (fallbackQuery ?? "").trim();

    while (padded.length < 3) {
      const index = padded.length;
      const factor = 0.15 * index;
      const score = Math.max(0, (base?.coverageScore ?? 0.4) - factor);
      padded.push({
        id: `candidate-${index + 1}`,
        query:
          index === 0 && baseQuery
            ? baseQuery
            : `${baseQuery} (補完${index})`.trim(),
        coverageScore: Number(score.toFixed(2)),
        coverageExplanation:
          (base?.coverageExplanation || "情報を補う候補") + "（補完）",
        addedAspects: base?.addedAspects ?? [],
        improvementReason:
          base?.improvementReason || "LLM応答不足のため自動補完",
        suggestedFollowups: base?.suggestedFollowups ?? [],
      });
    }

    return padded.slice(0, 3);
  }
}
