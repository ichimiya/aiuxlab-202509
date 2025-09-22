"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useResearchDetailStore } from "@/shared/stores/researchDetailStore";
import { useAppWindowLayoutStore } from "@/features/voiceRecognition/stores/appWindowLayoutStore";
import type {
  ResearchResultSnapshot,
  ResearchSnapshot,
} from "@/shared/useCases/ports/research";

interface ResearchDetailViewProps {
  id: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "処理中",
  completed: "完了",
  failed: "失敗",
};

export function ResearchDetailView({ id }: ResearchDetailViewProps) {
  const connect = useResearchDetailStore((state) => state.connect);
  const disconnect = useResearchDetailStore((state) => state.disconnect);
  const reconnect = useResearchDetailStore((state) => state.reconnect);
  const snapshot = useResearchDetailStore((state) => state.snapshots[id]);
  const connection = useResearchDetailStore((state) => state.connections[id]);
  const setPhaseOverride = useAppWindowLayoutStore(
    (state) => state.setPhaseOverride,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReexecuting, setIsReexecuting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    connect(id).catch(() => {
      if (!cancelled) {
        setErrorMessage("リサーチ情報の取得に失敗しました。");
      }
    });

    return () => {
      cancelled = true;
      disconnect(id);
    };
  }, [id, connect, disconnect]);

  useEffect(() => {
    setPhaseOverride("research");
    return () => {
      setPhaseOverride(null);
    };
  }, [setPhaseOverride]);

  useEffect(() => {
    if (connection?.status === "error" && connection.error) {
      setErrorMessage(`SSE接続に問題が発生しました: ${connection.error}`);
    } else if (connection?.status === "open") {
      setErrorMessage(null);
    }
  }, [connection]);

  const statusLabel = snapshot
    ? (STATUS_LABEL[snapshot.status] ?? snapshot.status)
    : undefined;

  const formattedCreatedAt = useMemo(
    () => formatDate(snapshot?.createdAt),
    [snapshot?.createdAt],
  );
  const formattedUpdatedAt = useMemo(
    () => formatDate(snapshot?.updatedAt),
    [snapshot?.updatedAt],
  );

  const handleReExecute = async () => {
    setErrorMessage(null);
    setIsReexecuting(true);
    try {
      const response = await fetch(`/api/research/${id}/re-execute`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await reconnect(id);
    } catch (error) {
      console.error("Failed to re-execute research", error);
      setErrorMessage(
        "追いリサーチの実行に失敗しました。時間をおいて再試行してください。",
      );
    } finally {
      setIsReexecuting(false);
    }
  };

  const isLoading = !snapshot || connection?.status === "connecting";
  const results = snapshot?.results ?? [];
  const searchResults = snapshot?.searchResults ?? [];
  const lastErrorMessage = snapshot?.lastError?.message ?? null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Research Detail</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          ← ホームに戻る
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <MetadataSection
          id={id}
          statusLabel={statusLabel}
          createdAt={formattedCreatedAt}
          updatedAt={formattedUpdatedAt}
          revision={snapshot?.revision}
        />

        <AlertsSection
          lastErrorMessage={lastErrorMessage}
          transientErrorMessage={errorMessage}
        />

        <ActionsSection
          onReExecute={handleReExecute}
          isReexecuting={isReexecuting}
        />

        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            リサーチ情報を読み込み中です...
          </p>
        )}

        <ResultsSection results={results} />

        <SearchResultsSection results={searchResults} />
      </div>
    </div>
  );
}

interface MetadataSectionProps {
  id: string;
  statusLabel?: string;
  createdAt: string;
  updatedAt: string;
  revision?: number;
}

function MetadataSection({
  id,
  statusLabel,
  createdAt,
  updatedAt,
  revision,
}: MetadataSectionProps) {
  return (
    <section
      data-testid="metadata-section"
      className="space-y-2"
      aria-labelledby="research-metadata-heading"
    >
      <h2 id="research-metadata-heading" className="text-xl font-semibold">
        リサーチ情報
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Research ID: {id}
      </p>
      {statusLabel && (
        <p className="text-sm font-medium">ステータス: {statusLabel}</p>
      )}
      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
        <p>作成日時: {createdAt}</p>
        <p>最終更新: {updatedAt}</p>
        {typeof revision === "number" && <p>Revision: {revision}</p>}
      </div>
    </section>
  );
}

interface AlertsSectionProps {
  lastErrorMessage: string | null;
  transientErrorMessage: string | null;
}

function AlertsSection({
  lastErrorMessage,
  transientErrorMessage,
}: AlertsSectionProps) {
  if (!lastErrorMessage && !transientErrorMessage) {
    return null;
  }

  return (
    <section className="space-y-3">
      {lastErrorMessage && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200">
          最終エラー: {lastErrorMessage}
        </div>
      )}

      {transientErrorMessage && (
        <div className="p-3 rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          {transientErrorMessage}
        </div>
      )}
    </section>
  );
}

interface ActionsSectionProps {
  onReExecute: () => void;
  isReexecuting: boolean;
}

function ActionsSection({ onReExecute, isReexecuting }: ActionsSectionProps) {
  return (
    <section
      data-testid="actions-section"
      className="flex flex-wrap gap-3"
      aria-label="リサーチ操作"
    >
      <button
        type="button"
        onClick={onReExecute}
        disabled={isReexecuting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {isReexecuting ? "追いリサーチ中..." : "追いリサーチ"}
      </button>
    </section>
  );
}

interface ResultsSectionProps {
  results: ResearchResultSnapshot[];
}

function ResultsSection({ results }: ResultsSectionProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="results-section"
      className="space-y-3"
      aria-labelledby="research-results-heading"
    >
      <h3 id="research-results-heading" className="text-lg font-semibold">
        リサーチ結果
      </h3>
      <div className="space-y-4">
        {results.map((result, index) => (
          <ResultCard key={`${result.id}-${index}`} result={result} />
        ))}
      </div>
    </section>
  );
}

interface ResultCardProps {
  result: ResearchResultSnapshot;
}

function ResultCard({ result }: ResultCardProps) {
  return (
    <article className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
          {result.source}
        </span>
        {typeof result.relevanceScore === "number" && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Relevance: {result.relevanceScore}
          </span>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-800 dark:text-gray-100 space-y-2">
        {result.content && <p>{result.content}</p>}
        {result.processedCitations && result.processedCitations.length > 0 && (
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {result.processedCitations.map((citation) => (
              <li key={citation.id}>
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {citation.title ?? citation.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

interface SearchResultsSectionProps {
  results: ResearchSnapshot["searchResults"];
}

function SearchResultsSection({ results }: SearchResultsSectionProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="search-results-section"
      className="space-y-3"
      aria-labelledby="related-search-heading"
    >
      <h3 id="related-search-heading" className="text-lg font-semibold">
        関連検索結果
      </h3>
      <ul className="space-y-2 text-sm">
        {results.map((result) => (
          <li key={result.id}>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-300"
            >
              {result.title}
            </a>
            {result.snippet && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.snippet}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
