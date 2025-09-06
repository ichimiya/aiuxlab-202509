"use client";

// import { useGetResearch } from "@/shared/api/generated/api";
// import { ResearchResult } from "@/shared/api/generated/models";
// import { ResearchVisualization } from "@/features/visualization/components/ResearchVisualization";
import Link from "next/link";

interface ResearchDetailViewProps {
  id: string;
}

export function ResearchDetailView({ id }: ResearchDetailViewProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Research Detail</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          ← ホームに戻る
        </Link>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">リサーチ詳細</h2>
          <p className="text-lg">Research ID: {id}</p>
          <p className="text-gray-600 dark:text-gray-400">
            POC段階では詳細表示は未実装です
          </p>
        </div>
      </div>
    </div>
  );
}
