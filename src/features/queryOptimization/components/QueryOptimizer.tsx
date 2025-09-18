"use client";
import React, { useEffect, useMemo, useState } from "react";
import { QueryComparison } from "./QueryComparison";
import { OptimizationSuggestions } from "./OptimizationSuggestions";
import { VoiceOptimizationStatus } from "../types";
import { VoiceSessionHUD } from "@/features/voiceRecognition/components/VoiceSessionHUD";
import { useVoiceSSE } from "@/features/voiceRecognition/hooks/useVoiceSSE";
import { VoiceRecognitionButton } from "@/features/voiceRecognition/components/VoiceRecognitionButton";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const STATUS_LABEL: Record<VoiceOptimizationStatus, string> = {
  [VoiceOptimizationStatus.Idle]: "待機中",
  [VoiceOptimizationStatus.Listening]: "音声認識中...",
  [VoiceOptimizationStatus.Transcribing]: "文字起こし中...",
  [VoiceOptimizationStatus.Optimizing]: "最適化処理中...",
  [VoiceOptimizationStatus.Completed]: "最適化完了",
  [VoiceOptimizationStatus.Error]: "エラーが発生しました",
};

export function QueryOptimizer() {
  const sessionId = useVoiceRecognitionStore((state) => state.sessionId);
  const sessionState = useVoiceRecognitionStore((state) => state.sessionState);
  const lastError = useVoiceRecognitionStore((state) => state.lastError);
  const isListening = useVoiceRecognitionStore((state) => state.isListening);

  const candidateSnapshots = useMemo(
    () => sessionState?.candidates ?? [],
    [sessionState?.candidates],
  );
  const candidates = useMemo(
    () =>
      candidateSnapshots.map((snapshot) => {
        const { rank, source, ...rest } = snapshot;
        void rank;
        void source;
        return rest;
      }),
    [candidateSnapshots],
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!candidates.length) {
      setSelectedCandidateId(null);
      return;
    }

    setSelectedCandidateId((current) => {
      if (current && candidates.some((candidate) => candidate.id === current)) {
        return current;
      }
      return sessionState?.selectedCandidateId ?? candidates[0]?.id ?? null;
    });
  }, [candidates, sessionState?.selectedCandidateId]);

  const selectedCandidate = useMemo(() => {
    if (!candidates.length) return null;
    if (!selectedCandidateId) return candidates[0] ?? null;
    return (
      candidates.find((candidate) => candidate.id === selectedCandidateId) ??
      candidates[0] ??
      null
    );
  }, [candidates, selectedCandidateId]);

  const status = useMemo(() => {
    if (isListening) return VoiceOptimizationStatus.Listening;
    switch (sessionState?.status) {
      case "optimizing":
        return VoiceOptimizationStatus.Optimizing;
      case "ready":
      case "researching":
        return VoiceOptimizationStatus.Completed;
      default:
        return VoiceOptimizationStatus.Idle;
    }
  }, [isListening, sessionState?.status]);

  useVoiceSSE({ sessionId, isPrimaryTab: true });

  const latestTranscript = sessionState?.latestTranscript;
  const evaluationSummary = sessionState?.evaluationSummary;
  const currentQuery = sessionState?.currentQuery ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <VoiceRecognitionButton />
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

      {currentQuery && (
        <div className="text-sm text-gray-700">
          <span className="font-medium">現在の検索クエリ:</span> {currentQuery}
        </div>
      )}

      {evaluationSummary && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">要約:</span> {evaluationSummary}
        </div>
      )}

      {lastError && (
        <div className="text-sm text-red-600" role="alert">
          {lastError}
        </div>
      )}

      {candidates.length > 0 && selectedCandidate && (
        <div className="space-y-4">
          <QueryComparison
            original={currentQuery}
            candidate={selectedCandidate}
          />
          <OptimizationSuggestions
            candidates={candidates}
            evaluationSummary={evaluationSummary}
            selectedCandidateId={selectedCandidate.id}
            onSelect={setSelectedCandidateId}
          />
        </div>
      )}
    </div>
  );
}
