import React, { useState } from "react";
import { useQueryOptimization } from "../hooks/useQueryOptimization";
import { QueryComparison } from "./QueryComparison";
import { OptimizationSuggestions } from "./OptimizationSuggestions";

export function QueryOptimizer() {
  const [input, setInput] = useState("");
  const { optimize, data, isPending } = useQueryOptimization();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await optimize({ originalQuery: input.trim() });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="qo-input">
          クエリ
        </label>
        <textarea
          id="qo-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full border rounded p-2"
          rows={3}
        />
        <button
          type="submit"
          className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
          disabled={isPending || !input.trim()}
        >
          最適化
        </button>
      </form>

      {data && (
        <div className="space-y-4">
          <QueryComparison original={input} optimized={data.optimizedQuery} />
          <OptimizationSuggestions
            addedAspects={data.addedAspects}
            improvementReason={data.improvementReason}
            suggestedFollowups={data.suggestedFollowups}
          />
        </div>
      )}
    </div>
  );
}
