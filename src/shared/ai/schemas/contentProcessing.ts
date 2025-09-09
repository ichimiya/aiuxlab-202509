import { z } from "zod";

export const ContentProcessingInputSchema = z.object({
  markdown: z.string().min(1),
  citations: z.array(z.string()).default([]),
  searchResults: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
      }),
    )
    .default([]),
});

export type ContentProcessingInput = z.infer<
  typeof ContentProcessingInputSchema
>;

export const ProcessedCitationSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  url: z.string().url(),
  title: z.string().optional(),
  domain: z.string().optional(),
});

export const ContentProcessingOutputSchema = z.object({
  htmlContent: z.string().min(1),
  processedCitations: z.array(ProcessedCitationSchema).default([]),
});

export type ContentProcessingOutput = z.infer<
  typeof ContentProcessingOutputSchema
>;
