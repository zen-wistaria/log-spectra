import z from "zod";

const tokenSchema = z.object({
  id: z.number(),
  token: z.string(),
  is_active: z.boolean(),
  agent_id: z.cuid(),
  last_used: z.date().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const TokenCreateSchema = tokenSchema.omit({
  id: true,
  token: true,
  created_at: true,
  updated_at: true,
  last_used: true,
});

export const TokenUpdateSchema = tokenSchema.omit({
  created_at: true,
  updated_at: true,
});

export type TokenCreate = z.infer<typeof TokenCreateSchema>;
export type TokenUpdate = z.infer<typeof TokenUpdateSchema>;
