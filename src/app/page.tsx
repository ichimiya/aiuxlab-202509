import React from "react";
import { ResearchInterface } from "@/features/research/components/ResearchInterface";
import { QueryOptimizer } from "@/features/queryOptimization/components/QueryOptimizer";

export default function Home() {
  return (
    <div className="grid gap-8">
      {/* Research Interface */}
      <div className="space-y-6">
        <ResearchInterface />
      </div>

      {/* Query Optimization */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">クエリ最適化</h2>
        <QueryOptimizer />
      </div>
    </div>
  );
}
