import React from "react";
import type { OptimizationCandidate } from "@/shared/api/generated/models";
import { GlassBox } from "@/shared/ui/GlassBox";

const CARD_ROW_TRACK_COUNT = 5;

type Props = {
  candidates: OptimizationCandidate[];
  selectedCandidateId?: string;
  onSelect?: (candidateId: string | null) => void;
  onStartResearch?: (candidate: OptimizationCandidate) => void;
};

function formatCoverage(score: number): string {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

export function OptimizationSuggestions({
  candidates,
  selectedCandidateId,
  onSelect,
  onStartResearch,
}: Props) {
  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-visible auto-rows-auto"
        style={{
          gridTemplateRows: `repeat(${CARD_ROW_TRACK_COUNT}, minmax(0, auto))`,
        }}
      >
        {candidates.map((candidate, index) => {
          const isSelected = candidate.id === selectedCandidateId;
          return (
            <GlassBox
              as="button"
              key={candidate.id}
              type="button"
              onMouseEnter={(event) => {
                event.currentTarget.focus({ preventScroll: true });
              }}
              onMouseLeave={(event) => {
                event.currentTarget.blur();
              }}
              onFocus={() => onSelect?.(candidate.id)}
              onBlur={() => onSelect?.(null)}
              onClick={() => onStartResearch?.(candidate)}
              aria-pressed={isSelected}
              data-layout="subgrid"
              className={`grid grid-rows-[subgrid] content-start gap-2 text-left focus:outline-none focus:border-blue-300/60 ${
                isSelected
                  ? "border-blue-300/60 shadow-[0_0_22px_rgba(147,197,253,0.26)]"
                  : "border-white/10 hover:border-blue-300/60"
              }`}
              style={{
                gridRow: `span ${CARD_ROW_TRACK_COUNT}`,
              }}
            >
              <div className="flex items-center justify-between text-sm font-medium row-start-1 row-span-1">
                <span>{`候補${index + 1}`}</span>
                <span className="font-semibold">
                  {formatCoverage(candidate.coverageScore)}
                </span>
              </div>
              <p className="text-blue-100 text-md font-semibold row-start-2 row-span-1">
                {candidate.query}
              </p>
              <p className="text-xs text-blue-300/80 row-start-3 row-span-1">
                {candidate.coverageExplanation}
              </p>

              {candidate.addedAspects && candidate.addedAspects.length > 0 && (
                <div className="flex flex-col gap-1 text-xs row-start-4 row-span-1">
                  <h4 className="font-semibold">追加観点</h4>
                  <ul className="list-disc list-inside space-y-0.5">
                    {candidate.addedAspects.map((aspect) => (
                      <li key={aspect}>{aspect}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(!candidate.addedAspects ||
                candidate.addedAspects.length === 0) && (
                <div className="row-start-4 row-span-1" aria-hidden="true" />
              )}

              {candidate.suggestedFollowups &&
                candidate.suggestedFollowups.length > 0 && (
                  <div className="flex flex-col gap-1 text-xs row-start-5 row-span-1">
                    <h4 className="font-semibold">推奨追加調査</h4>
                    <ul className="list-disc list-inside space-y-0.5">
                      {candidate.suggestedFollowups.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              {(!candidate.suggestedFollowups ||
                candidate.suggestedFollowups.length === 0) && (
                <div className="row-start-5 row-span-1" aria-hidden="true" />
              )}
            </GlassBox>
          );
        })}
      </div>
    </div>
  );
}
