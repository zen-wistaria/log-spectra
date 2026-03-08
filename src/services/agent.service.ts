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
    const orderBy: Prisma.AgentOrderByWithRelationInput[] = [];
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
    const where: Prisma.AgentWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { hostname: { contains: search, mode: "insensitive" } },
        { ip_address: { contains: search, mode: "insensitive" } },
        { os: { contains: search, mode: "insensitive" } },
      ];
    }
    return await prisma.agent.findMany({
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
    return await prisma.agent.create({
      data,
    });
  }

  static async updateAgent(data: AgentUpdate) {
    return await prisma.agent.update({
      where: {
        id: data.id,
      },
      data,
    });
  }

  static async deleteAgent(id: string) {
    return await prisma.agent.delete({
      where: { id },
    });
  }

  static async total() {
    return await prisma.agent.count();
  }

  static async getActiveAgents() {
    return await prisma.agent.count({
      where: {
        status: true,
      },
    });
  }

  static async getInactiveAgents() {
    return await prisma.agent.count({
      where: {
        status: false,
      },
    });
  }
}
