"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getResearchContentClassName } from "@/features/research/utils/getResearchContentClassName";
import { extractDomainFromUrl } from "@/features/research/utils/extractDomainFromUrl";
import { formatReferenceLabel } from "@/features/research/utils/formatReferenceLabel";
import { GlassBox } from "@/shared/ui/GlassBox";
import { useResearchDetailStore } from "@/shared/stores/researchDetailStore";
import { useAppWindowLayoutStore } from "@/features/voiceRecognition/stores/appWindowLayoutStore";
import { buildMindMapFromResults } from "@/features/research/utils/mindMap";
import type {
  ResearchResultSnapshot,
  ResearchSnapshot,
} from "@/shared/useCases/ports/research";
import {
  buildResearchMetadata,
  type ResearchMetadata,
} from "./researchMetadata";
import { ResearchMindMapSection } from "./ResearchMindMapSection";
import {
  useSelectionInsights,
  type UseSelectionInsightsState,
} from "@/features/research/hooks/useSelectionInsights";
import type { SelectionInsight } from "@/shared/useCases/ports/selectionInsights";

interface ResearchDetailViewProps {
  id: string;
}

interface HoveredMindMapNode {
  resultId: string;
  elementId?: string;
  domPath?: number[];
}

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
  const [hoveredMindMapNode, setHoveredMindMapNode] =
    useState<HoveredMindMapNode | null>(null);

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

  const metadata = useMemo(
    () => buildResearchMetadata({ id, snapshot, formatDate }),
    [id, snapshot],
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
  const mindMapRoots = useMemo(
    () => buildMindMapFromResults(results),
    [results],
  );
  const searchResults = snapshot?.searchResults ?? [];
  const lastErrorMessage = snapshot?.lastError?.message ?? null;

  return (
    <div className="grid grid-cols-1 gap-5 dark:bg-gray-800 rounded-lg shadow-lg md:grid-cols-[20%_1px_1fr_20%] w-full h-full min-h-0">
      <div className="space-y-4 overflow-auto scrollbar-hide min-h-0">
        <MetadataSection metadata={metadata} />

        <ResearchMindMapSection
          nodes={mindMapRoots}
          onNodeHover={(node) => {
            if (!node || !node.metadata?.resultId) {
              setHoveredMindMapNode(null);
              return;
            }

            setHoveredMindMapNode({
              resultId: node.metadata.resultId,
              elementId: node.metadata.elementId,
              domPath: node.domPath,
            });
          }}
        />

        <AlertsSection
          lastErrorMessage={lastErrorMessage}
          transientErrorMessage={errorMessage}
        />

        <ActionsSection
          onReExecute={handleReExecute}
          isReexecuting={isReexecuting}
        />
      </div>
      <hr className="w-[1px] h-full bg-slate-800" />
      <div
        className="space-y-4 overflow-auto scrollbar-hide min-h-0"
        data-selection-scope="research-results"
      >
        {isLoading && <p className="text-sm ">Loading...</p>}

        <ResultsSection results={results} hoveredNode={hoveredMindMapNode} />
      </div>
      <div className="overflow-auto scrollbar-hide min-h-0 space-y-4">
        <SelectionInsightsPanel researchId={id} />
        <SearchResultsSection results={searchResults} />
      </div>
    </div>
  );
}

interface MetadataSectionProps {
  metadata: ResearchMetadata;
}

function MetadataSection({ metadata }: MetadataSectionProps) {
  return (
    <section
      data-testid="metadata-section"
      className="space-y-4"
      aria-labelledby="research-metadata-heading"
    >
      {metadata.query && (
        <h1 className="text-lg text-blue-200 font-semibold">
          {metadata.query}
        </h1>
      )}
      <dl className="grid grid-cols-1 gap-2 text-sm">
        {metadata.items.map((item) => (
          <div key={item.key} className="flex flex-col gap-1">
            <dt className="font-michroma text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {item.label}
            </dt>
            <dd className="font-michroma text-[10px] font-medium truncate text-blue-300">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
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
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20">
          最終エラー: {lastErrorMessage}
        </div>
      )}

      {transientErrorMessage && (
        <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
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
        className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {isReexecuting ? "追いリサーチ中..." : "追いリサーチ"}
      </button>
    </section>
  );
}

interface ResultsSectionProps {
  results: ResearchResultSnapshot[];
  hoveredNode: HoveredMindMapNode | null;
}

function ResultsSection({ results, hoveredNode }: ResultsSectionProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="results-section"
      aria-labelledby="research-results-heading"
    >
      <div className="space-y-2">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.id}-${index}`}
            result={result}
            hoveredNode={hoveredNode}
          />
        ))}
      </div>
    </section>
  );
}

interface ResultCardProps {
  result: ResearchResultSnapshot;
  hoveredNode: HoveredMindMapNode | null;
}

function ResultCard({ result, hoveredNode }: ResultCardProps) {
  const htmlContent = getResultHtmlContent(result);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    clearMindMapHighlight(container);

    if (!hoveredNode || hoveredNode.resultId !== result.id) {
      return;
    }

    if (
      !hoveredNode.elementId &&
      (!hoveredNode.domPath || hoveredNode.domPath.length === 0)
    ) {
      container.classList.add("mindmap-highlight");
      return;
    }

    const targetById = hoveredNode.elementId
      ? document.getElementById(hoveredNode.elementId)
      : null;

    const targetByPath =
      !targetById && hoveredNode.domPath
        ? findElementByDomPath(container, hoveredNode.domPath)
        : null;

    (targetById ?? targetByPath ?? container).classList.add(
      "mindmap-highlight",
    );
  }, [hoveredNode, result.id, htmlContent]);

  return (
    <section>
      <div
        ref={containerRef}
        className={getResearchContentClassName()}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {result.processedCitations && result.processedCitations.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-xs">
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
    </section>
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
      aria-labelledby="related-search-heading"
    >
      <ul className="grid grid-cols-1 gap-5 text-sm">
        {results.map((result, index) => {
          const domain = extractDomainFromUrl(result.url);
          const label = formatReferenceLabel(index);

          return (
            <li key={result.id} className="list-none">
              <GlassBox
                as="a"
                href={result.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={
                  domain
                    ? `${result.title}（ドメイン: ${domain}）`
                    : result.title
                }
                className="flex h-full flex-col gap-2 border-white/10 hover:border-blue-300/60 focus-visible:border-blue-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/20"
              >
                <div className="flex items-start justify-between text-xs font-medium text-blue-200/80">
                  <span className="font-michroma text-[10px] uppercase tracking-[0.12em] text-blue-100/60">
                    {label}
                  </span>
                  {domain && (
                    <span
                      className="truncate font-michroma text-[10px] uppercase text-blue-300/80"
                      title={domain}
                    >
                      {domain}
                    </span>
                  )}
                </div>
                <p className="text-md font-semibold text-blue-100/80">
                  {result.title}
                </p>
                {result.snippet && (
                  <p className="text-[10px] text-blue-300/80">
                    {result.snippet}
                  </p>
                )}
              </GlassBox>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface SelectionInsightsPanelProps {
  researchId: string;
}

function SelectionInsightsPanel({ researchId }: SelectionInsightsPanelProps) {
  const state = useSelectionInsights(researchId);
  return <SelectionInsightsSection {...state} />;
}

type SelectionInsightsSectionProps = UseSelectionInsightsState;

function SelectionInsightsSection({
  status,
  data,
  error,
}: SelectionInsightsSectionProps) {
  const shouldRender =
    status !== "idle" || !!data || (error ? error.length > 0 : false);
  if (!shouldRender) {
    return null;
  }

  return (
    <section
      data-testid="selection-insights-section"
      className="space-y-3"
      aria-labelledby="selection-insights-heading"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="selection-insights-heading" className="text-lg font-semibold">
          選択テキストの追加調査
        </h3>
        {status === "loading" && (
          <span className="text-xs text-slate-400">解析中...</span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed whitespace-pre-wrap text-blue-100">
            {data.summary}
          </p>

          {data.generatedAt && (
            <p className="text-[11px] text-slate-500">
              生成日時: {formatDate(data.generatedAt)}
            </p>
          )}

          {data.insights.length > 0 ? (
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <SelectionInsightCard
                  key={insight.id || `${index}`}
                  insight={insight}
                  position={index}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              追加の洞察は取得できませんでした。
            </p>
          )}
        </div>
      )}
    </section>
  );
}

interface SelectionInsightCardProps {
  insight: SelectionInsight;
  position: number;
}

function SelectionInsightCard({
  insight,
  position,
}: SelectionInsightCardProps) {
  const label = formatReferenceLabel(position);
  const domain = insight.recommendedSources[0]
    ? extractDomainFromUrl(insight.recommendedSources[0].url)
    : null;

  return (
    <article className="rounded-lg border border-white/10 bg-slate-900/30 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-blue-100 mt-1">
          {insight.title}
        </h4>
      </div>

      <p className="text-xs leading-relaxed text-blue-200/90 whitespace-pre-wrap">
        {insight.summary}
      </p>

      {insight.keyPoints.length > 0 && (
        <div className="space-y-1">
          <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            注目ポイント
          </h5>
          <ul className="space-y-1 list-disc pl-4 text-xs text-blue-200/90">
            {insight.keyPoints.map((point, idx) => (
              <li key={`${insight.id}-kp-${idx}`}>
                <span className="font-medium text-blue-100">{point.label}</span>
                {point.detail && (
                  <span className="block text-[11px] text-slate-400">
                    {point.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
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

function getResultHtmlContent(result: ResearchResultSnapshot) {
  const html = result.htmlContent?.trim();
  if (html) {
    return html;
  }

  const text = result.content?.trim();
  if (!text) {
    return "";
  }

  return `<p>${escapeHtml(text)}</p>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findElementByDomPath(
  rootElement: HTMLElement,
  domPath: number[],
): HTMLElement | null {
  let current: Element | null = rootElement;

  for (const index of domPath) {
    if (!current) {
      return null;
    }

    const child = current.children.item(index);
    if (!child) {
      return null;
    }

    current = child;
  }

  return current as HTMLElement | null;
}

function clearMindMapHighlight(rootElement: HTMLElement) {
  rootElement.classList.remove("mindmap-highlight");
  rootElement
    .querySelectorAll<HTMLElement>(".mindmap-highlight")
    .forEach((element) => element.classList.remove("mindmap-highlight"));
}
