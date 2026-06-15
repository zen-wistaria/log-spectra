import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AgentCreate, AgentUpdate } from "@/schema/agent.schema";

export interface GetAgentsParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: using for agent services
export class AgentService {
  static async getAgents({ page, limit, search, sort }: GetAgentsParams) {
    const orderBy: Prisma.AgentsOrderByWithRelationInput[] = [];
    if (sort) {
      const fields = sort.split(",");
      fields.forEach((field) => {
        const isDesc = field.startsWith("-");
        const fieldName = isDesc ? field.substring(1) : field;
        if (fieldName === "logs") {
          orderBy.push({
            anomaly_logs: {
              _count: isDesc ? "desc" : "asc",
            },
          });
        } else {
          orderBy.push({
            [fieldName]: isDesc ? "desc" : "asc",
          });
        }
      });
    }
    const where: Prisma.AgentsWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { hostname: { contains: search, mode: "insensitive" } },
        { ip_address: { contains: search, mode: "insensitive" } },
        { os: { contains: search, mode: "insensitive" } },
      ];
    }
    return await prisma.agents.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            anomaly_logs: true,
          },
        },
      },
    });
  }

  static async createAgent(data: AgentCreate) {
    return await prisma.agents.create({
      data,
    });
  }

  static async updateAgent(data: AgentUpdate) {
    return await prisma.agents.update({
      where: {
        id: data.id,
      },
      data,
    });
  }

  static async deleteAgent(id: string) {
    return await prisma.agents.delete({
      where: { id },
    });
  }

  static async total() {
    return await prisma.agents.count();
  }

  static async getAgentById(id: string) {
    return await prisma.agents.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            anomaly_logs: true,
            tokens: true,
          },
        },
      },
    });
  }

  static async getCountActiveAgents() {
    return await prisma.agents.count({
      where: {
        status: "online",
      },
    });
  }

  static async getCountInactiveAgents() {
    return await prisma.agents.count({
      where: {
        status: "offline",
      },
    });
  }

  static async getActiveAgents() {
    return await prisma.agents.findMany({
      where: {
        status: "online",
      },
    });
  }

  static async updateAgentStatus(id: string, status: string) {
    return await prisma.agents.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}
