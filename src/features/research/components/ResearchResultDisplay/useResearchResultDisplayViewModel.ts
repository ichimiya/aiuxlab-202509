import { useMemo } from "react";
import type { Research, ResearchResult } from "@/shared/api/generated/models";

export interface ResearchResultDisplayViewModelProps {
  research: Research | null;
  isLoading?: boolean;
  error?: unknown;
}

export interface ResearchResultDisplayViewModel {
  // Data
  research: Research | null;
  results: ResearchResult[];

  // UI State
  isLoading: boolean;
  hasError: boolean;
  hasResults: boolean;
  hasCitations: boolean;
  hasSearchResults: boolean;

  // Computed Values
  statusDisplayConfig: {
    text: string;
    colorClass: string;
  };

  // Helper Functions
  formatResultContent: (content: string) => string;
  getRelevancePercentage: (score?: number) => string;
}

export function useResearchResultDisplayViewModel({
  research,
  isLoading = false,
  error = null,
}: ResearchResultDisplayViewModelProps): ResearchResultDisplayViewModel {
  // Computed values
  const results = useMemo(() => research?.results || [], [research?.results]);

  const hasError = useMemo(() => !!error, [error]);
  const hasResults = useMemo(() => results.length > 0, [results]);
  const hasCitations = useMemo(
    () => !!research?.citations && research.citations.length > 0,
    [research?.citations],
  );
  const hasSearchResults = useMemo(
    () => !!research?.searchResults && research.searchResults.length > 0,
    [research?.searchResults],
  );

  const statusDisplayConfig = useMemo(() => {
    if (!research?.status) {
      return {
        text: "不明",
        colorClass: "bg-gray-100 text-gray-800",
      };
    }

    switch (research.status) {
      case "completed":
        return {
          text: "完了",
          colorClass:
            "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
        };
      case "pending":
        return {
          text: "処理中",
          colorClass:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
        };
      case "failed":
        return {
          text: "失敗",
          colorClass:
            "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
        };
      default:
        return {
          text: research.status,
          colorClass:
            "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
        };
    }
  }, [research?.status]);

  // Helper functions
  const formatResultContent = (content: string): string => {
    // HTMLコンテンツをそのまま返却（BFF層で処理済み）
    return content;
  };

  const getRelevancePercentage = (score?: number): string => {
    if (typeof score !== "number") return "N/A";
    return `${(score * 100).toFixed(1)}%`;
  };

  return {
    // Data
    research,
    results,

    // UI State
    isLoading,
    hasError,
    hasResults,
    hasCitations,
    hasSearchResults,

    // Computed Values
    statusDisplayConfig,

    // Helper Functions
    formatResultContent,
    getRelevancePercentage,
  };
}
