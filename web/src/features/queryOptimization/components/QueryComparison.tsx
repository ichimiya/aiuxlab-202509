import React from "react";
import type { OptimizationCandidate } from "@/shared/api/generated/models";

type Props = {
  original: string;
  candidate: OptimizationCandidate;
};

function highlightDiff(
  original: string,
  candidateQuery: string,
): React.ReactNode[] {
  const originalWords = original.split(/\s+/).filter(Boolean);
  const candidateWords = candidateQuery.split(/\s+/).filter(Boolean);
  const originals = new Set(originalWords);

  return candidateWords
    .map((word, index) => {
      if (originals.has(word)) {
        return <span key={`${word}-${index}`}>{word}</span>;
      }
      return (
        <mark key={`${word}-${index}`} className="bg-yellow-200">
          {word}
        </mark>
      );
    })
    .flatMap((node, index) => (index > 0 ? [" ", node] : [node]));
}

export function QueryComparison({ original, candidate }: Props) {
  const highlighted = highlightDiff(original, candidate.query);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section
        aria-label="最適化前"
        role="region"
        className="p-2 border rounded"
      >
        <h3 className="font-medium mb-1">最適化前</h3>
        <p>{original}</p>
      </section>
      <section
        aria-label="候補クエリ"
        role="region"
        className="p-2 border rounded"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium mb-1">候補クエリ</h3>
          <span className="text-sm text-blue-600 font-semibold">
            {`${Math.round(candidate.coverageScore * 100)}%`}
          </span>
        </div>
        <p>{highlighted}</p>
        {candidate.coverageExplanation && (
          <p className="mt-2 text-xs text-gray-600">
            {candidate.coverageExplanation}
          </p>
        )}
      </section>
    </div>
  );
}
