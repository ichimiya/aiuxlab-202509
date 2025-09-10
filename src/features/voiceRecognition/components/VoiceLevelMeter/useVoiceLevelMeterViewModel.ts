import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { getAudioIO } from "@/shared/infrastructure/browser/audio";
import { useResearchStore } from "@/shared/stores/researchStore";

export function useVoiceLevelMeterViewModel() {
  const { isListening } = useResearchStore();
  const [volume, setVolume] = useState(0);
  // AudioContextは共有管理のためローカルでは保持しない
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // マイクからの音声レベルを取得
  const startVolumeMonitoring = useCallback(async () => {
    try {
      const { audioContext: context, stream: sharedStream } =
        await getAudioIO().acquire();
      const source = context.createMediaStreamSource(sharedStream);
      const analyserNode = context.createAnalyser();

      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);

      // AudioContextは共有のためここでは保持しない
      setStream(sharedStream);
      setAnalyser(analyserNode);

      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserNode) return;

        analyserNode.getByteFrequencyData(dataArray);

        // RMSで音量計算
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedVolume = Math.min(rms / 128, 1); // 0-1に正規化

        setVolume(normalizedVolume);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (error) {
      console.error("Failed to start volume monitoring:", error);
      setVolume(0);
    }
  }, []);

  const stopVolumeMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 共有Audioなので release のみ（closeしない）
    if (stream) {
      getAudioIO()
        .release()
        .catch(() => void 0);
    }
    setStream(null);

    setAnalyser(null);
    setVolume(0);
    // audioContext は共有管理のためここでの依存は不要
  }, [stream]);

  // 音声認識状態に応じて監視開始/停止
  useEffect(() => {
    if (isListening) {
      startVolumeMonitoring();
    } else {
      stopVolumeMonitoring();
    }

    return () => {
      stopVolumeMonitoring();
    };
  }, [isListening, startVolumeMonitoring, stopVolumeMonitoring]);

  const displayState = useMemo(() => {
    const volumePercentage = Math.min(volume * 100, 100);

    return {
      isVisible: isListening,
      volumePercentage,
      levelBarClassName: `h-full transition-all duration-100 rounded-full ${
        volumePercentage > 70
          ? "bg-red-500"
          : volumePercentage > 40
            ? "bg-yellow-500"
            : "bg-green-500"
      }`,
      volumeText: `${Math.round(volumePercentage)}%`,
    };
  }, [isListening, volume]);

  return {
    displayState,
  };
}
