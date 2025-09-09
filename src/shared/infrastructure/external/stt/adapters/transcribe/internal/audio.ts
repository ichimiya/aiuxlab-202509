/**
 * Shared Audio I/O for browser (internal)
 */

export type AcquireOptions = { sampleRate?: number };
export type AcquireResult = {
  audioContext: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
};

class AudioIO {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private refs = 0;
  private pending: Promise<AcquireResult> | null = null;

  async acquire(opts: AcquireOptions = {}): Promise<AcquireResult> {
    if (typeof window === "undefined" || typeof navigator === "undefined")
      throw new Error("AudioIO is browser-only");
    if (this.pending) return this.pending;
    if (this.audioContext && this.stream && this.source) {
      try {
        if (this.audioContext.state === "suspended")
          await this.audioContext.resume();
      } catch {}
      this.refs++;
      return {
        audioContext: this.audioContext,
        stream: this.stream,
        source: this.source,
      };
    }
    this.pending = this.init(opts)
      .then((res) => {
        this.pending = null;
        this.refs = 1;
        return res;
      })
      .catch((e) => {
        this.pending = null;
        throw e;
      });
    return this.pending;
  }

  private async init(opts: AcquireOptions): Promise<AcquireResult> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: opts.sampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const AudioContextClass: typeof AudioContext | undefined =
      (window as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) throw new Error("AudioContext not supported");
    const ac: AudioContext = new AudioContextClass({
      sampleRate: opts.sampleRate,
    });
    try {
      if (ac.state === "suspended") await ac.resume();
    } catch {}
    const src = ac.createMediaStreamSource(stream);
    this.audioContext = ac;
    this.stream = stream;
    this.source = src;
    return { audioContext: ac, stream, source: src };
  }

  async release(): Promise<void> {
    if (this.refs > 0) this.refs--;
    if (this.refs > 0) return;
    try {
      if (this.audioContext && this.audioContext.state !== "closed")
        await this.audioContext.suspend();
    } catch {}
    try {
      this.stream?.getTracks().forEach((t) => t.stop());
    } catch {}
    this.source = null;
    this.stream = null;
  }
}

let sharedAudio: AudioIO | null = null;
export function getAudioIO(): AudioIO {
  if (!sharedAudio) sharedAudio = new AudioIO();
  return sharedAudio;
}
