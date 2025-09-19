import React from "react";
import type { OptimizationCandidate } from "@/shared/api/generated/models";

type Props = {
  candidates: OptimizationCandidate[];
  evaluationSummary?: string;
  selectedCandidateId?: string;
  onSelect?: (candidateId: string) => void;
};

function formatCoverage(score: number): string {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

export function OptimizationSuggestions({
  candidates,
  evaluationSummary,
  selectedCandidateId,
  onSelect,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {candidates.map((candidate, index) => {
          const isSelected = candidate.id === selectedCandidateId;
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelect?.(candidate.id)}
              aria-pressed={isSelected}
              className={`text-left p-4 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                <span>{`候補${index + 1}`}</span>
                <span className="text-blue-600 font-semibold">
                  {formatCoverage(candidate.coverageScore)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {candidate.query}
              </p>
              <p className="mt-2 text-xs text-gray-600">
                {candidate.coverageExplanation}
              </p>

              {candidate.addedAspects && candidate.addedAspects.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-gray-500">
                    追加観点
                  </h4>
                  <ul className="mt-1 text-xs text-gray-700 list-disc list-inside space-y-0.5">
                    {candidate.addedAspects.map((aspect) => (
                      <li key={aspect}>{aspect}</li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.suggestedFollowups &&
                candidate.suggestedFollowups.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-gray-500">
                      推奨追加調査
                    </h4>
                    <ul className="mt-1 text-xs text-gray-700 list-disc list-inside space-y-0.5">
                      {candidate.suggestedFollowups.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </button>
          );
        })}
      </div>

      {evaluationSummary && (
        <section className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <h3 className="font-medium mb-1">全体サマリー</h3>
          <p className="text-sm text-gray-700">{evaluationSummary}</p>
        </section>
      )}
    </div>
  );
}
