import React from "react";
import {
  useResearchResultDisplayViewModel,
  type ResearchResultDisplayViewModelProps,
} from "./useResearchResultDisplayViewModel";

export interface ResearchResultDisplayProps
  extends ResearchResultDisplayViewModelProps {
  className?: string;
}

export function ResearchResultDisplay({
  research,
  isLoading = false,
  error = null,
  className = "",
}: ResearchResultDisplayProps) {
  const viewModel = useResearchResultDisplayViewModel({
    research,
    isLoading,
    error,
  });

  if (viewModel.isLoading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (viewModel.hasError) {
    return (
      <div
        className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}
      >
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
          エラーが発生しました
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300">
          {(error as Error)?.message || "不明なエラーが発生しました"}
        </p>
      </div>
    );
  }

  if (!viewModel.research) {
    return (
      <div
        className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border ${className}`}
      >
        <p className="text-gray-600 dark:text-gray-400 text-center">
          リサーチ結果がありません
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Research Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            リサーチ結果
          </h3>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${viewModel.statusDisplayConfig.colorClass}`}
          >
            {viewModel.statusDisplayConfig.text}
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ID:
            </span>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {viewModel.research.id}
            </p>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              クエリ:
            </span>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {viewModel.research.query}
            </p>
          </div>
        </div>
      </div>

      {/* Research Results */}
      {viewModel.hasResults ? (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            検索結果 ({viewModel.results.length}件)
          </h4>

          {viewModel.results.map((result) => (
            <div
              key={result.id}
              className="bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-3"
            >
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {viewModel.formatResultContent(result.content)}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="font-medium">出典: {result.source}</span>

                {result.relevanceScore && (
                  <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    関連度:{" "}
                    {viewModel.getRelevancePercentage(result.relevanceScore)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border p-6 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg
              className="mx-auto h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            検索結果がありません
          </p>
        </div>
      )}
    </div>
  );
}
