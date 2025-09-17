"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryOptimization } from "../hooks/useQueryOptimization";
import { QueryComparison } from "./QueryComparison";
import { OptimizationSuggestions } from "./OptimizationSuggestions";
import type {
  OptimizationResult,
  QueryOptimizationRequest,
} from "@/shared/api/generated/models";
import type { VoicePattern } from "@/shared/api/generated/models";
import { createProcessVoiceCommandUseCase } from "@/shared/useCases/ProcessVoiceCommandUseCase/factory";
import type { VoiceCommandResult } from "@/shared/useCases/ProcessVoiceCommandUseCase";
import { VoiceOptimizationStatus } from "../types";

const STATUS_LABEL: Record<VoiceOptimizationStatus, string> = {
  [VoiceOptimizationStatus.Idle]: "待機中",
  [VoiceOptimizationStatus.Listening]: "音声認識中...",
  [VoiceOptimizationStatus.Transcribing]: "文字起こし中...",
  [VoiceOptimizationStatus.Optimizing]: "最適化処理中...",
  [VoiceOptimizationStatus.Completed]: "最適化完了",
  [VoiceOptimizationStatus.Error]: "エラーが発生しました",
};

export function QueryOptimizer() {
  const [status, setStatus] = useState(VoiceOptimizationStatus.Idle);
  const [latestTranscript, setLatestTranscript] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const hasOptimizedRef = useRef(false);

  const voiceUseCase = useMemo(() => createProcessVoiceCommandUseCase(), []);
  const { optimize } = useQueryOptimization();

  const isBusy =
    status === VoiceOptimizationStatus.Listening ||
    status === VoiceOptimizationStatus.Transcribing ||
    status === VoiceOptimizationStatus.Optimizing;

  useEffect(() => {
    if (result?.candidates?.length) {
      setSelectedCandidateId(
        result.recommendedCandidateId ?? result.candidates[0]?.id ?? null,
      );
    }
  }, [result]);

  const selectedCandidate = useMemo(() => {
    if (!result?.candidates?.length) return null;
    return (
      result.candidates.find(
        (candidate) => candidate.id === selectedCandidateId,
      ) ?? result.candidates[0]
    );
  }, [result, selectedCandidateId]);

  const runOptimization = useCallback(
    async (payload: QueryOptimizationRequest) => {
      try {
        const optimization = await optimize(payload);
        setSessionId(optimization.sessionId);
        setResult(optimization.result);
        setStatus(VoiceOptimizationStatus.Completed);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "クエリ最適化に失敗しました";
        setError(message);
        setStatus(VoiceOptimizationStatus.Error);
      }
    },
    [optimize],
  );

  const handleVoiceOptimization = useCallback(async () => {
    if (isBusy) return;

    if (voiceUseCase.isProcessing) {
      try {
        await voiceUseCase.stopProcessing();
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (stopErr) {
        console.warn("前回の音声認識を停止できませんでした", stopErr);
      }
    }

    setError(null);
    setResult(null);
    setSelectedCandidateId(null);
    setLatestTranscript("");
    hasOptimizedRef.current = false;
    setStatus(VoiceOptimizationStatus.Listening);

    try {
      await voiceUseCase.processRealTimeAudio(
        (voiceResult: VoiceCommandResult) => {
          const recognizedText = (voiceResult.originalText ?? "").trim();
          setLatestTranscript(recognizedText);

          if (voiceResult.isPartial) {
            setStatus(VoiceOptimizationStatus.Transcribing);
            return;
          }

          if (!recognizedText) {
            setError("音声を認識できませんでした");
            setStatus(VoiceOptimizationStatus.Error);
            void voiceUseCase.stopProcessing().catch(() => undefined);
            return;
          }

          if (hasOptimizedRef.current) {
            return;
          }
          hasOptimizedRef.current = true;

          setStatus(VoiceOptimizationStatus.Optimizing);

          const payload: QueryOptimizationRequest = {
            originalQuery: recognizedText,
            voiceTranscript: recognizedText,
          };
          if (voiceResult.pattern) {
            payload.voiceCommand = voiceResult.pattern as VoicePattern;
          }
          if (sessionId) {
            payload.sessionId = sessionId;
          }

          void (async () => {
            try {
              await Promise.resolve(voiceUseCase.stopProcessing()).catch(
                () => undefined,
              );
            } catch (stopError) {
              console.warn("音声認識の停止に失敗しました", stopError);
            }
            await runOptimization(payload);
          })();
        },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "音声認識を開始できませんでした";
      setError(message);
      setStatus(VoiceOptimizationStatus.Error);
    }
  }, [isBusy, runOptimization, voiceUseCase]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={handleVoiceOptimization}
          disabled={isBusy}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isBusy
              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          音声で最適化
        </button>
        <span className="text-sm text-gray-700" aria-live="polite">
          {STATUS_LABEL[status]}
        </span>
      </div>

      {latestTranscript && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">最新の文字起こし:</span>{" "}
          {latestTranscript}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {result?.candidates && selectedCandidate && (
        <div className="space-y-4">
          <QueryComparison
            original={latestTranscript}
            candidate={selectedCandidate}
          />
          <OptimizationSuggestions
            candidates={result.candidates}
            evaluationSummary={result.evaluationSummary}
            selectedCandidateId={selectedCandidate.id}
            onSelect={setSelectedCandidateId}
          />
        </div>
      )}
    </div>
  );
}
