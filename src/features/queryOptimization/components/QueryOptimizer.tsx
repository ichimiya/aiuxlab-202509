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
import { VoiceSessionHUD } from "@/features/voiceRecognition/components/VoiceSessionHUD";
import { useVoiceRecognitionControls } from "./useVoiceRecognitionControls";
import { useVoiceSSE } from "@/features/voiceRecognition/hooks/useVoiceSSE";

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
  const listeningLoopActiveRef = useRef(false);
  const processingActiveRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const voiceUseCase = useMemo(() => createProcessVoiceCommandUseCase(), []);
  const { optimize } = useQueryOptimization();
  const {
    setSessionId: setVoiceSessionId,
    setSessionState: setVoiceSessionState,
    setError: storeSetError,
    clearError: storeClearError,
    isListening,
    startListening: markListening,
    stopListening: markNotListening,
  } = useVoiceRecognitionControls();

  useVoiceSSE({ sessionId, isPrimaryTab: true });

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

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const runOptimization = useCallback(
    async (payload: QueryOptimizationRequest) => {
      try {
        const optimization = await optimize(payload);
        setSessionId(optimization.sessionId);
        setVoiceSessionId(optimization.sessionId);
        setVoiceSessionState({
          sessionId: optimization.sessionId,
          status: "ready",
          candidates: (optimization.result.candidates ?? []).map(
            (candidate, index) => ({
              id: candidate.id,
              query: candidate.query,
              coverageScore: candidate.coverageScore,
              rank: index + 1,
              source: "llm" as const,
            }),
          ),
          selectedCandidateId: optimization.result.recommendedCandidateId,
          lastUpdatedAt: new Date().toISOString(),
        });
        setResult(optimization.result);
        setStatus(VoiceOptimizationStatus.Completed);
        storeClearError();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "クエリ最適化に失敗しました";
        setError(message);
        setStatus(VoiceOptimizationStatus.Error);
        storeSetError(message);
      }
    },
    [
      optimize,
      setVoiceSessionId,
      setVoiceSessionState,
      storeClearError,
      storeSetError,
    ],
  );

  const startListeningLoop = useCallback(() => {
    if (!listeningLoopActiveRef.current || processingActiveRef.current) {
      return;
    }

    setStatus(VoiceOptimizationStatus.Listening);
    setError(null);
    storeClearError();

    processingActiveRef.current = true;

    voiceUseCase.processRealTimeAudio((voiceResult: VoiceCommandResult) => {
      const recognizedText = (voiceResult.originalText ?? "").trim();
      setLatestTranscript(recognizedText);

      if (voiceResult.isPartial) {
        setStatus(VoiceOptimizationStatus.Transcribing);
        return;
      }

      if (!recognizedText) {
        const message = "音声を認識できませんでした";
        setError(message);
        storeSetError(message);
        setStatus(VoiceOptimizationStatus.Error);
        listeningLoopActiveRef.current = false;
        processingActiveRef.current = false;
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
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId) {
        payload.sessionId = currentSessionId;
      }

      void (async () => {
        try {
          await Promise.resolve(voiceUseCase.stopProcessing()).catch(
            () => undefined,
          );
        } catch (stopError) {
          console.warn("音声認識の停止に失敗しました", stopError);
        }

        processingActiveRef.current = false;
        await runOptimization(payload);
        hasOptimizedRef.current = false;

        if (listeningLoopActiveRef.current) {
          setStatus(VoiceOptimizationStatus.Listening);
          startListeningLoop();
        }
      })();
    });
  }, [runOptimization, storeClearError, storeSetError, voiceUseCase]);

  const stopListeningLoop = useCallback(async () => {
    if (!listeningLoopActiveRef.current && !processingActiveRef.current) {
      setStatus(VoiceOptimizationStatus.Idle);
      return;
    }
    listeningLoopActiveRef.current = false;
    processingActiveRef.current = false;
    hasOptimizedRef.current = false;
    try {
      await voiceUseCase.stopProcessing();
    } catch (error) {
      console.warn("音声認識の停止に失敗しました", error);
    }
    setStatus(VoiceOptimizationStatus.Idle);
  }, [voiceUseCase]);

  const handleVoiceOptimization = useCallback(() => {
    if (isListening) {
      markNotListening();
    } else {
      markListening();
    }
  }, [isListening, markListening, markNotListening]);

  useEffect(() => {
    if (isListening) {
      if (!listeningLoopActiveRef.current) {
        listeningLoopActiveRef.current = true;
        processingActiveRef.current = false;
        setError(null);
        storeClearError();
        setResult(null);
        setSelectedCandidateId(null);
        setLatestTranscript("");
        hasOptimizedRef.current = false;
        setStatus(VoiceOptimizationStatus.Listening);
        setVoiceSessionId(null);
        setVoiceSessionState(null);
        startListeningLoop();
      }
    } else {
      if (listeningLoopActiveRef.current || processingActiveRef.current) {
        void stopListeningLoop();
      }
    }
  }, [
    isListening,
    startListeningLoop,
    stopListeningLoop,
    storeClearError,
    setResult,
    setSelectedCandidateId,
    setVoiceSessionId,
    setVoiceSessionState,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={handleVoiceOptimization}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isListening
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {isListening ? "音声認識停止" : "音声認識開始"}
        </button>
        <span className="text-sm text-gray-700" aria-live="polite">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <VoiceSessionHUD />

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
