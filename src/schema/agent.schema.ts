import z from "zod";

const agentSchema = z.object({
  id: z.cuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  hostname: z.string().optional(),
  ip_address: z.string().optional(),
  os: z.string().optional(),
  status: z.boolean(),
  lastSeen: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const AgentCreateSchema = agentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSeen: true,
  status: true,
});

export const AgentUpdateSchema = agentSchema.omit({
  createdAt: true,
  updatedAt: true,
  lastSeen: true,
});

export type AgentCreate = z.infer<typeof AgentCreateSchema>;
export type AgentUpdate = z.infer<typeof AgentUpdateSchema>;
