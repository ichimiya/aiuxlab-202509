import React from "react";

type Props = {
  addedAspects: string[];
  improvementReason: string;
  suggestedFollowups: string[];
};

export function OptimizationSuggestions({
  addedAspects,
  improvementReason,
  suggestedFollowups,
}: Props) {
  return (
    <div className="space-y-3">
      <section>
        <h3 className="font-medium mb-1">追加された観点</h3>
        <ul className="list-disc pl-5">
          {addedAspects.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium mb-1">改善の理由</h3>
        <p>{improvementReason}</p>
      </section>

      <section>
        <h3 className="font-medium mb-1">推奨追加調査</h3>
        <ul className="list-disc pl-5">
          {suggestedFollowups.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
