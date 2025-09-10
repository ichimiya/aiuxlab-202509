import React from "react";
import { ResearchInterface } from "@/features/research/components/ResearchInterface";
import { QueryOptimizer } from "@/features/queryOptimization/components/QueryOptimizer";

export default function Home() {
  return (
    <div className="grid grid-cols-3">
      {/* Research Interface */}
      <div className="w-full space-y-6">
        <ResearchInterface />
      </div>

      {/* Query Optimization */}
      <div className="w-full space-y-6">
        <h2 className="text-xl font-semibold">クエリ最適化</h2>
        <QueryOptimizer />
      </div>
    </div>
  );
}
