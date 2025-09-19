import { z } from "zod";
import { VOICE_INTENT_IDS } from "@/shared/domain/voice/intents";

const VoiceIntentIdLiterals = VOICE_INTENT_IDS.map((intentId) =>
  z.literal(intentId),
) as [
  z.ZodLiteral<(typeof VOICE_INTENT_IDS)[number]>,
  ...Array<z.ZodLiteral<(typeof VOICE_INTENT_IDS)[number]>>,
];

export const VoiceIntentConfidenceBandSchema = z.enum([
  "auto",
  "confirm",
  "reject",
] as const);

const VoiceIntentIdSchema = z.union(VoiceIntentIdLiterals);

export const VoiceIntentClassificationOutputSchema = z.object({
  intentId: VoiceIntentIdSchema,
  confidence: z.number().min(0).max(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
  rationale: z.string().max(160).optional(),
  confidenceBand: VoiceIntentConfidenceBandSchema.optional(),
});

export type VoiceIntentClassificationOutput = z.infer<
  typeof VoiceIntentClassificationOutputSchema
>;
