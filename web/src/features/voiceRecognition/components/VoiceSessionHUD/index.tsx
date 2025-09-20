import React, { useMemo } from "react";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const STATUS_LABEL: Record<string, string> = {
  idle: "待機中",
  optimizing: "最適化処理中",
  ready: "準備完了",
  researching: "リサーチ中",
};

export function VoiceSessionHUD() {
  const {
    sessionId,
    sessionState,
    pendingIntent,
    lastError,
    reconnectAttempt,
    isSseConnected,
  } = useVoiceRecognitionStore();

  const statusLabel = useMemo(() => {
    if (!sessionState?.status) return "未接続";
    return STATUS_LABEL[sessionState.status] ?? sessionState.status;
  }, [sessionState?.status]);

  if (!sessionId && !sessionState) {
    return (
      <div className="p-3 border rounded bg-white shadow-sm text-sm text-gray-600">
        音声セッションを開始すると進行状況が表示されます
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 border rounded bg-white shadow-sm text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`font-medium ${isSseConnected ? "text-green-600" : "text-yellow-600"}`}
        >
          {isSseConnected ? "接続中" : "再接続待機"}
        </span>
        {sessionId && (
          <span className="text-gray-500">セッションID: {sessionId}</span>
        )}
        <span className="text-gray-700">状態: {statusLabel}</span>
      </div>

      {pendingIntent && (
        <div className="text-blue-700" role="status">
          確認待ち: {pendingIntent.intentId} (信頼度{" "}
          {pendingIntent.confidence.toFixed(2)})
        </div>
      )}

      {lastError && (
        <div className="text-red-600" role="alert">
          エラー: {lastError}
        </div>
      )}

      {reconnectAttempt > 0 && (
        <div className="text-gray-500">再接続試行中 ({reconnectAttempt})</div>
      )}
    </div>
  );
}
