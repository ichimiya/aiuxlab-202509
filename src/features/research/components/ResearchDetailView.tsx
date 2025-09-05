"use client";

import { useGetResearch } from "@/shared/api/generated/api";
import { ResearchResult } from "@/shared/api/generated/models";
import { ResearchVisualization } from "@/features/visualization/components/ResearchVisualization";
import Link from "next/link";

interface ResearchDetailViewProps {
  id: string;
}

export function ResearchDetailView({ id }: ResearchDetailViewProps) {
  // This will use the prefetched data from server, then refetch if needed
  const { data: research, isLoading, error } = useGetResearch(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <div className="text-lg text-red-600">エラーが発生しました</div>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ホームに戻る
        </Link>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <div className="text-lg">リサーチが見つかりません</div>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ホームに戻る
        </Link>
      </div>
    );
  }

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

      {/* Research Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">リサーチクエリ</h2>
          <p className="text-lg">{research.query}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">ID:</span> {research.id}
          </div>
          <div>
            <span className="font-medium">ステータス:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs ${
                research.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : research.status === "processing"
                    ? "bg-yellow-100 text-yellow-800"
                    : research.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {research.status}
            </span>
          </div>
          <div>
            <span className="font-medium">作成日:</span>
            {new Date(research.createdAt).toLocaleString("ja-JP")}
          </div>
          {research.updatedAt && (
            <div>
              <span className="font-medium">更新日:</span>
              {new Date(research.updatedAt).toLocaleString("ja-JP")}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {research.results && research.results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">リサーチ結果</h2>
          <div className="space-y-4">
            {research.results.map((result: ResearchResult, index: number) => (
              <div
                key={result.id || index}
                className="border-l-4 border-blue-500 pl-4"
              >
                <p className="mb-2">{result.content}</p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">出典:</span> {result.source}
                  {result.relevanceScore && (
                    <span className="ml-4">
                      <span className="font-medium">関連度:</span>{" "}
                      {result.relevanceScore.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D Visualization */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">3D可視化</h2>
        <ResearchVisualization />
      </div>
    </div>
  );
}
