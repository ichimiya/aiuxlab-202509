import type { Research, VoicePattern } from "@/shared/api/generated/models";

export interface QueryOptimizationRequest {
  originalQuery: string;
  selectedText?: string;
  voiceCommand?: VoicePattern;
  researchHistory?: Research[];
  userContext?: {
    interests?: string[];
    expertise?: string[];
    previousOptimizations?: OptimizationResult[];
  };
}

export interface OptimizationResult {
  optimizedQuery: string;
  addedAspects: string[];
  improvementReason: string;
  confidence: number; // 0..1
  suggestedFollowups: string[];
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

    const history = req.researchHistory ?? [];
    if (history.length > 0) {
      const recent = history
        .slice(-3)
        .map((h) => `- ${h.query}`)
        .join("\n");
      parts.push(`【履歴（最近${Math.min(history.length, 3)}件）】\n${recent}`);
    }

    return parts.join("\n\n");
  }

  static formatOptimizationResult(
    result: OptimizationResult,
  ): OptimizationResult {
    const seen = new Set<string>();
    const dedupAspects = (result.addedAspects || []).filter((a) => {
      const key = (a ?? "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const confidence = Math.max(0, Math.min(1, Number(result.confidence ?? 0)));

    return {
      optimizedQuery: (result.optimizedQuery ?? "").trim(),
      addedAspects: dedupAspects,
      improvementReason: (result.improvementReason ?? "").trim(),
      confidence,
      suggestedFollowups: (result.suggestedFollowups ?? []).map((s) =>
        (s ?? "").trim(),
      ),
    };
  }
}
