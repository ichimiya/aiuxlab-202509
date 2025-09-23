import { z } from "zod";

export const SelectionInsightSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  reason: z.string().optional(),
});

export const SelectionInsightKeyPointSchema = z.object({
  label: z.string().min(1),
  detail: z.string().optional(),
});

export const SelectionInsightItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  keyPoints: z.array(SelectionInsightKeyPointSchema).default([]),
  recommendedSources: z.array(SelectionInsightSourceSchema).default([]),
});

export const SelectionInsightTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  guidingQuestions: z.array(z.string().min(1)).default([]),
});

export const SelectionInsightTopicListSchema = z.object({
  topics: z.array(SelectionInsightTopicSchema).min(1),
});

export const SelectionInsightResultSchema = z.object({
  summary: z.string().min(1),
  insights: z.array(SelectionInsightItemSchema).default([]),
  generatedAt: z.string().optional(),
});

export type SelectionInsightResult = z.infer<
  typeof SelectionInsightResultSchema
>;
export type SelectionInsight = z.infer<typeof SelectionInsightItemSchema>;
export type SelectionInsightSource = z.infer<
  typeof SelectionInsightSourceSchema
>;
export type SelectionInsightKeyPoint = z.infer<
  typeof SelectionInsightKeyPointSchema
>;
export type SelectionInsightTopic = z.infer<typeof SelectionInsightTopicSchema>;
export type SelectionInsightTopicList = z.infer<
  typeof SelectionInsightTopicListSchema
>;
