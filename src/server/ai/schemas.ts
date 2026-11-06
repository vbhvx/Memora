import { z } from 'zod';

export const aiTitleResponseSchema = z.object({
  title: z.string().trim().min(1).max(255),
  explanation: z.string().optional(),
});
export type AiTitleResponse = z.infer<typeof aiTitleResponseSchema>;

export const summaryModeSchema = z
  .enum(['executive', 'bullets', 'action_plan', 'tldr'])
  .default('executive');
export type SummaryMode = z.infer<typeof summaryModeSchema>;

export const aiSummaryResponseSchema = z.object({
  summary: z.string().trim().min(1),
  keyPoints: z.array(z.string().trim()).default([]),
  mode: summaryModeSchema.optional(),
  sourceVersion: z.number().int().optional(),
});
export type AiSummaryResponse = z.infer<typeof aiSummaryResponseSchema>;

export const aiActionItemSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  dueDateText: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.85),
  sourceExcerpt: z.string().min(1),
});
export type AiActionItem = z.infer<typeof aiActionItemSchema>;

export const aiActionsResponseSchema = z.object({
  items: z.array(aiActionItemSchema),
});
export type AiActionsResponse = z.infer<typeof aiActionsResponseSchema>;

