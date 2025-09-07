import React from "react";

type Props = {
  original: string;
  optimized: string;
};

export function QueryComparison({ original, optimized }: Props) {
  const originalWords = original.split(/\s+/).filter(Boolean);
  const optimizedWords = optimized.split(/\s+/).filter(Boolean);
  const originals = new Set(originalWords);

  return (
    <div className="grid grid-cols-2 gap-4">
      <section
        aria-label="最適化前"
        role="region"
        className="p-2 border rounded"
      >
        <h3 className="font-medium mb-1">最適化前</h3>
        <p>{original}</p>
      </section>
      <section
        aria-label="最適化後"
        role="region"
        className="p-2 border rounded"
      >
        <h3 className="font-medium mb-1">最適化後</h3>
        <p>
          {optimizedWords
            .map((w, i) =>
              originals.has(w) ? (
                <span key={i}>{(i ? " " : "") + w}</span>
              ) : (
                <mark key={i}>
                  {i ? "" : ""}
                  {w}
                </mark>
              ),
            )
            .reduce((acc: React.ReactNode[], cur, idx) => {
              if (idx > 0) acc.push(" ");
              acc.push(cur);
              return acc;
            }, [])}
        </p>
      </section>
    </div>
  );
}
