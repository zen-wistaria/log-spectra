import z from "zod";

const anomalySchema = z.object({
  id: z.number(),
  ip: z.string(),
  request_count: z.number(),
  error_count: z.number(),
  request_per_second: z.number(),
  unique_endpoint_ration: z.number(),
  risk_score: z.number(),
  risk_category: z.string(),
  risk_reasons: z.array(z.string()),
  resolved_mark: z.boolean(),
  resolved_at: z.date().optional(),
  resolved_notes: z.string().optional(),
  agent_id: z.cuid(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const AnomalyCreateSchema = anomalySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const AnomalyUpdateSchema = anomalySchema.pick({
  resolved_mark: true,
  resolved_at: true,
  resolved_notes: true,
  agent_id: true,
  ip: true,
});

export type AnomalyCreate = z.infer<typeof AnomalyCreateSchema>;
export type AnomalyUpdate = z.infer<typeof AnomalyUpdateSchema>;
