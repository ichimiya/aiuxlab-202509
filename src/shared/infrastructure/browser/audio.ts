let ac: AudioContext | null = null;
let stream: MediaStream | null = null;
let ref = 0;

async function ensureAudio() {
  if (ac && stream) return { audioContext: ac, stream };
  const AnyWin = window as unknown as {
    webkitAudioContext?: typeof AudioContext;
    AudioContext?: typeof AudioContext;
  };
  const Ctor: typeof AudioContext = (AnyWin.AudioContext ||
    AnyWin.webkitAudioContext ||
    AudioContext) as typeof AudioContext;
  ac = new Ctor();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return { audioContext: ac, stream };
}

export function getAudioIO() {
  return {
    async acquire() {
      ref += 1;
      return ensureAudio();
    },
    async release() {
      ref = Math.max(0, ref - 1);
      if (ref === 0) {
        try {
          stream?.getTracks().forEach((t) => t.stop());
        } catch {}
        try {
          await ac?.suspend();
          await ac?.close();
        } catch {}
        stream = null;
        ac = null;
      }
    },
  };
}
