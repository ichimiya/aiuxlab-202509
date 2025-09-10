import type { SpeechToTextPort } from "@/shared/useCases/ports/speechToText";
import { TranscribeAdapter } from "./adapters/transcribe/transcribeAdapter";
import { SimpleTranscribeAdapter } from "./simple/simpleAdapter";

export function createSpeechToTextAdapter(): SpeechToTextPort {
  const engine = (process.env.NEXT_PUBLIC_STT_ENGINE || "")
    .toString()
    .toLowerCase();
  if (engine === "simple") return new SimpleTranscribeAdapter();
  return new TranscribeAdapter();
}
