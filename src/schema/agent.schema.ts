import z from "zod";

const agentSchema = z.object({
  id: z.cuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  hostname: z.string().optional(),
  ip_address: z.string().optional(),
  os: z.string().optional(),
  status: z.enum(["online", "offline", "deleted"]),
  machine_id: z.string().optional(),
  version: z.string().optional(),
  lastSeen: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const AgentCreateSchema = agentSchema.omit({
  id: true,
  hostname: true,
  ip_address: true,
  os: true,
  machine_id: true,
  version: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const AgentUpdateSchema = agentSchema.omit({
  hostname: true,
  ip_address: true,
  os: true,
  version: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export type AgentCreate = z.infer<typeof AgentCreateSchema>;
export type AgentUpdate = z.infer<typeof AgentUpdateSchema>;
