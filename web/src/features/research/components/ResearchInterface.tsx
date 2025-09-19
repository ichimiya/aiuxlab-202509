"use client";

import React, { useState } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import { VoiceRecognitionButton } from "../../voiceRecognition/components/VoiceRecognitionButton";
import { VoiceStatusIndicator } from "../../voiceRecognition/components/VoiceStatusIndicator";
import { VoiceLevelMeter } from "../../voiceRecognition/components/VoiceLevelMeter";
import { VoiceCommandHistory } from "../../voiceRecognition/components/VoiceCommandHistory";
import { useRouter } from "next/navigation";

export function ResearchInterface() {
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { selectedText, voiceCommand, voiceTranscript, setCurrentResearchId } =
    useResearchStore();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!query) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          selectedText,
          voiceCommand,
          voiceTranscript,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const snapshot = (await response.json()) as {
        id: string;
      };
      setCurrentResearchId(snapshot.id);
      router.push(`/research/${snapshot.id}`);
    } catch (error) {
      console.error("Failed to start research", error);
      setErrorMessage(
        "リサーチの開始に失敗しました。時間をおいて再試行してください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Main Search */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-center">AI Research POC</h1>
          <p className="text-center text-gray-600 dark:text-gray-400">
            テキスト選択 + 音声コマンドによる直感的なリサーチ体験
          </p>
        </div>

        {/* Query Input */}
        <div className="space-y-2">
          <label htmlFor="query" className="block text-sm font-medium">
            リサーチクエリ
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="何を調べたいですか？"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>

        {/* Selected Text Display */}
        {selectedText && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium mb-2">選択されたテキスト:</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {selectedText}
            </p>
          </div>
        )}

        {/* Voice Command Display */}
        {(voiceCommand || voiceTranscript) && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-sm font-medium mb-2">音声コマンド:</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {voiceCommand}
            </p>
            {voiceTranscript && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                認識テキスト: {voiceTranscript}
              </p>
            )}
          </div>
        )}

        {/* Voice Recognition Components */}
        <div className="space-y-4">
          <VoiceStatusIndicator />
          <VoiceLevelMeter />
          <VoiceCommandHistory />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!query || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "リサーチ中..." : "リサーチ開始"}
          </button>
          <VoiceRecognitionButton />
        </div>

        {errorMessage && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
