"use server";

import type { AgentCreate, AgentUpdate } from "@/schema/agent.schema";
import type { GetAgentsParams } from "@/services/agent.service";
import { AgentService } from "@/services/agent.service";

export async function getAgents(params: GetAgentsParams) {
  try {
    const data = await AgentService.getAgents(params);
    const total = await AgentService.total();
    const pages = Math.ceil(total / params.limit);
    return {
      data,
      total,
      pages,
    };
  } catch {
    throw new Error("Cannot get data");
  }
}

export async function createAgent(data: AgentCreate) {
  return AgentService.createAgent(data);
}

export async function updateAgent(data: AgentUpdate) {
  return AgentService.updateAgent(data);
}

export async function deleteAgent(id: string) {
  return AgentService.deleteAgent(id);
}

export async function getAgentById(id: string) {
  return AgentService.getAgentById(id);
}
