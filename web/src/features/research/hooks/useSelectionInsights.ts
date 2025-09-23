import { useEffect, useRef, useState } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import type { SelectionInsightResult } from "@/shared/useCases/ports/selectionInsights";

export type SelectionInsightsStatus = "idle" | "loading" | "loaded" | "error";

export interface UseSelectionInsightsState {
  status: SelectionInsightsStatus;
  data: SelectionInsightResult | null;
  error: string | null;
}

const DEFAULT_STATE: UseSelectionInsightsState = {
  status: "idle",
  data: null,
  error: null,
};

function createSignature(selection: unknown): string {
  try {
    return JSON.stringify(selection);
  } catch {
    return "";
  }
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useSelectionInsights(
  researchId: string,
): UseSelectionInsightsState {
  const selection = useResearchStore((state) => state.textSelection);
  const [state, setState] = useState<UseSelectionInsightsState>(() => ({
    ...DEFAULT_STATE,
  }));
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selection || !selection.text?.trim()) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      lastSignatureRef.current = null;
      setState((prev) => {
        if (prev.data) {
          return {
            status: "loaded",
            data: prev.data,
            error: null,
          };
        }
        if (prev.error) {
          return {
            status: "error",
            data: null,
            error: prev.error,
          };
        }
        return { ...DEFAULT_STATE };
      });
      return;
    }

    const signature = createSignature({
      text: selection.text.trim(),
      context: selection.context?.trim() ?? null,
      timestamp: selection.metadata?.timestamp ?? null,
    });

    if (signature && signature === lastSignatureRef.current) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    timerRef.current = window.setTimeout(async () => {
      if (!isMountedRef.current) return;

      setState((prev) => ({
        status: "loading",
        data: prev.data,
        error: null,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `/api/research/${researchId}/selection-insights`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ selection }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const errorBody = await safeParseJson(response);
          const detail =
            errorBody && typeof errorBody.message === "string"
              ? errorBody.message
              : undefined;

          if (!controller.signal.aborted && isMountedRef.current) {
            setState((prev) => ({
              status: "error",
              data: prev.data,
              error: detail
                ? `選択テキストの追加調査に失敗しました: ${detail}`
                : "選択テキストの追加調査に失敗しました。",
            }));
            lastSignatureRef.current = null;
          }
          return;
        }

        const data = (await response.json()) as SelectionInsightResult;
        if (!controller.signal.aborted && isMountedRef.current) {
          setState({
            status: "loaded",
            data,
            error: null,
          });
          lastSignatureRef.current = signature;
        }
      } catch (error) {
        if (controller.signal.aborted || !isMountedRef.current) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "選択テキストの追加調査に失敗しました";
        setState((prev) => ({
          status: "error",
          data: prev.data,
          error: `選択テキストの追加調査に失敗しました: ${message}`,
        }));
        lastSignatureRef.current = null;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [researchId, selection]);

  return state;
}
