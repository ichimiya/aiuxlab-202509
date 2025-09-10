import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  StartStreamTranscriptionCommandInput,
} from "@aws-sdk/client-transcribe-streaming";
import type { AudioStream } from "@aws-sdk/client-transcribe-streaming";

export type SimpleSttConfig = {
  region: string;
  languageCode: "ja-JP" | "en-US";
  chunkMs?: number; // default 60ms
  lowLatency?: boolean; // default true
};

export type SimpleSttHandlers = {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onConnectionStatusChange?: (
    s: "connecting" | "connected" | "disconnected" | "error",
  ) => void;
};

export class TranscribeClient {
  private client: TranscribeStreamingClient | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private pcmQueue: Uint8Array[] = [];
  private connected: boolean = false;
  private stopping = false;
  private handlers: SimpleSttHandlers = {};
  private autoReconnect = true;
  private reconnecting = false;

  constructor(private readonly cfg: SimpleSttConfig) {}

  setHandlers(h: SimpleSttHandlers) {
    this.handlers = h;
  }

  checkSupport(): boolean {
    if (typeof window === "undefined") return false;
    const hasMedia =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    return !!(hasMedia && "AudioContext" in window);
  }

  async requestPermission(): Promise<boolean> {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      this.handlers.onError?.("Microphone permission denied");
      return false;
    }
  }

  private updateStatus(
    s: "connecting" | "connected" | "disconnected" | "error",
  ) {
    this.handlers.onConnectionStatusChange?.(s);
  }

  private convertFloat32ToPCM16(float32Array: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      const int16Value =
        sample < 0 ? Math.floor(sample * 32768) : Math.floor(sample * 32767);
      view.setInt16(i * 2, int16Value, true);
    }
    return new Uint8Array(buffer);
  }

  private async initAudio(): Promise<number> {
    const AnyWin = window as unknown as {
      webkitAudioContext?: typeof AudioContext;
      AudioContext?: typeof AudioContext;
    };
    const Ctor: typeof AudioContext = (AnyWin.AudioContext ||
      AnyWin.webkitAudioContext ||
      AudioContext) as typeof AudioContext;
    const ac = new Ctor();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ac.createMediaStreamSource(stream);
    // Worklet inline module that just forwards Float32Array frames
    const code = `
      class PCMTap extends AudioWorkletProcessor {
        constructor(options){ super(); this.frameSize=(options.processorOptions?.frameSize)||512; }
        process(inputs){
          const ch = inputs[0];
          if (ch && ch[0]) this.port.postMessage(ch[0]);
          return true;
        }
      }
      registerProcessor('pcm-tap', PCMTap);
    `;
    const blob = new Blob([code], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    await ac.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const node = new AudioWorkletNode(ac, "pcm-tap", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      processorOptions: { frameSize: 512 },
    });
    node.port.onmessage = (ev: MessageEvent) => {
      const f32 = new Float32Array(ev.data as ArrayBufferLike);
      this.pcmQueue.push(this.convertFloat32ToPCM16(f32));
    };
    source.connect(node);
    this.audioContext = ac;
    this.mediaStream = stream;
    this.workletNode = node;
    return ac.sampleRate;
  }

  private async initAws() {
    this.client = new TranscribeStreamingClient({
      region: this.cfg.region,
      // 注意: 本番ではクライアントに長期キーを置かないこと。
      credentials: {
        accessKeyId: (process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ??
          "") as string,
        secretAccessKey: (process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ??
          "") as string,
      },
    });
  }

  private buildAudioStream(sr: number): AsyncIterable<AudioStream> {
    const chunkMs = Math.max(20, Math.min(this.cfg.chunkMs ?? 60, 1000));
    const audioStream: AsyncIterable<AudioStream> = {
      [Symbol.asyncIterator]: (): AsyncIterator<AudioStream> => {
        const it: AsyncIterator<AudioStream> = {
          next: async (): Promise<IteratorResult<AudioStream>> => {
            if (this.stopping)
              return { done: true, value: undefined as unknown as AudioStream };
            // 目標バイト量
            const bytesPerMs = (sr * 2) / 1000;
            const target = Math.max(
              2,
              Math.floor((bytesPerMs * chunkMs) / 2) * 2,
            );
            let buf: Uint8Array | null = null;
            while (!buf && !this.stopping) {
              buf = this.pcmQueue.shift() || null;
              if (!buf)
                await new Promise<void>((r) =>
                  setTimeout(r, this.cfg.lowLatency === false ? 20 : 5),
                );
            }
            if (!buf)
              return { done: true, value: undefined as unknown as AudioStream };
            // 可能なら複数チャンクをまとめて目標サイズへ
            let acc = buf;
            while (acc.length < target) {
              const next = this.pcmQueue.shift();
              if (!next) break;
              const m = new Uint8Array(acc.length + next.length);
              m.set(acc);
              m.set(next, acc.length);
              acc = m;
            }
            return {
              done: false,
              value: {
                AudioEvent: { AudioChunk: acc },
              } as unknown as AudioStream,
            };
          },
        };
        return it;
      },
    };
    return audioStream;
  }

  private async startAwsSession(sr: number): Promise<void> {
    const input: StartStreamTranscriptionCommandInput = {
      LanguageCode: this.cfg.languageCode,
      MediaEncoding: "pcm",
      MediaSampleRateHertz: sr,
      AudioStream: this.buildAudioStream(sr),
      EnablePartialResultsStabilization: true,
      PartialResultsStability: this.cfg.lowLatency === false ? "medium" : "low",
    } as const;

    const cmd = new StartStreamTranscriptionCommand(input);
    this.connected = true;
    this.updateStatus("connected");
    const resp = await (this.client as TranscribeStreamingClient).send(cmd);
    // イベント読み出し
    const stream = resp.TranscriptResultStream as
      | undefined
      | AsyncIterable<{
          TranscriptEvent?: {
            Transcript?: {
              Results?: Array<{
                Alternatives: Array<{ Transcript: string }>;
                IsPartial: boolean;
              }>;
            };
          };
        }>
      | undefined;
    if (!stream) return;
    (async () => {
      try {
        for await (const event of stream) {
          const results = event?.TranscriptEvent?.Transcript?.Results;
          if (!results) continue;
          for (const r of results) {
            const text = r.Alternatives?.[0]?.Transcript;
            if (text != null) this.handlers.onResult?.(text, !r.IsPartial);
          }
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        const msg = (err?.message || "stream error").toLowerCase();
        // 自動再接続（15秒無音タイムアウトなど）
        const shouldReconnect =
          this.autoReconnect &&
          !this.stopping &&
          (msg.includes("no new audio") ||
            msg.includes("timed out") ||
            msg.includes("timeout"));
        if (shouldReconnect && !this.reconnecting) {
          try {
            this.reconnecting = true;
            this.connected = false;
            this.updateStatus("connecting");
            await new Promise((r) => setTimeout(r, 100));
            const sr2 = this.audioContext?.sampleRate ?? sr;
            await this.startAwsSession(sr2);
            return;
          } catch {
            // fallthrough to error handler
          } finally {
            this.reconnecting = false;
          }
        }
        this.connected = false;
        this.updateStatus("error");
        this.handlers.onError?.(err?.message || "stream error");
      }
    })();
  }

  async start(): Promise<void> {
    if (this.connected) return;
    this.updateStatus("connecting");
    if (!this.client) await this.initAws();
    const sr = this.audioContext?.sampleRate ?? (await this.initAudio());
    await this.startAwsSession(sr);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.connected = false;
    this.updateStatus("disconnected");
    try {
      if (this.workletNode) {
        try {
          this.workletNode.port.onmessage = null;
          this.workletNode.disconnect();
        } catch {}
        this.workletNode = null;
      }
      if (this.audioContext) {
        try {
          await this.audioContext.suspend();
          await this.audioContext.close();
        } catch {}
        this.audioContext = null;
      }
      if (this.mediaStream) {
        try {
          this.mediaStream.getTracks().forEach((t) => t.stop());
        } catch {}
        this.mediaStream = null;
      }
      this.pcmQueue = [];
    } finally {
      this.stopping = false;
    }
  }
}
