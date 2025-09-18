import { BaseBedrockClient } from "@/shared/infrastructure/clients/bedrock/BedrockClient";
import { buildVoiceIntentClassifierPrompt } from "@/shared/ai/prompts/voiceIntentClassifier";
import type {
  VoiceIntentClassifierPort,
  VoiceIntentInput,
  VoiceIntentResult,
} from "@/shared/useCases/ports/voice";
import { VoiceIntentClassificationOutputSchema } from "@/shared/ai/schemas/voiceIntent";

function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  const withoutFence = trimmed.replace(/```json|```/gi, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON block not found in response");
  }
  return withoutFence.slice(start, end + 1);
}

export class BedrockVoiceIntentClassifierAdapter
  extends BaseBedrockClient
  implements VoiceIntentClassifierPort
{
  async classify(input: VoiceIntentInput): Promise<VoiceIntentResult> {
    const prompt = buildVoiceIntentClassifierPrompt(input);
    const text = await this.invokePrompt(prompt);
    let raw: unknown;
    try {
      const jsonText = extractJsonBlock(text);
      raw = JSON.parse(jsonText);
      const parsed = VoiceIntentClassificationOutputSchema.safeParse(raw);

      if (parsed.success) {
        const { intentId, confidence, parameters } = parsed.data;
        return {
          intentId,
          confidence,
          parameters,
        } satisfies VoiceIntentResult;
      }

      console.warn(
        "[BedrockVoiceIntentClassifierAdapter] schema validation failed",
        parsed.error.issues,
      );
      return normalizeVoiceIntentClassification(raw);
    } catch (error) {
      console.warn(
        "[BedrockVoiceIntentClassifierAdapter] failed to parse or validate response",
        error,
      );
      if (raw) {
        try {
          return normalizeVoiceIntentClassification(raw);
        } catch (normalizeError) {
          console.error(
            "[BedrockVoiceIntentClassifierAdapter] normalize fallback failed",
            normalizeError,
          );
        }
      }

      throw new Error(
        error instanceof Error
          ? `Invalid intent classification response: ${error.message}`
          : "Invalid intent classification response",
      );
    }
  }
}

export function normalizeVoiceIntentClassification(
  raw: unknown,
): VoiceIntentResult {
  if (!isPlainRecord(raw)) {
    throw new Error("intent classification result must be an object");
  }

  const intentIdValue = raw.intentId;
  if (typeof intentIdValue !== "string" || intentIdValue.trim().length === 0) {
    throw new Error("intentId is required");
  }

  const confidenceValue = raw.confidence;
  if (typeof confidenceValue !== "number" || Number.isNaN(confidenceValue)) {
    throw new Error("confidence must be a number");
  }

  const normalizedIntentId = intentIdValue.trim().toUpperCase();
  const normalizedConfidence = clamp(confidenceValue, 0, 1);
  const parameters = isPlainRecord(raw.parameters) ? raw.parameters : {};

  return {
    intentId: normalizedIntentId,
    confidence: normalizedConfidence,
    parameters,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
