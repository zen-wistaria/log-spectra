import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AnomalyUpdate } from "@/schema/anomaly.schema";

export interface GetAnomaliesParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
  agentId?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: using for agent services
export class AnomalyService {
  static async getAnomalies({
    page,
    limit,
    search,
    sort,
    agentId,
  }: GetAnomaliesParams) {
    const orderBy: Prisma.AnomalyLogOrderByWithRelationInput[] = [];
    if (sort) {
      const fields = sort.split(",");
      fields.forEach((field) => {
        const isDesc = field.startsWith("-");
        const fieldName = isDesc ? field.substring(1) : field;

        if (fieldName === "agent-name") {
          orderBy.push({
            agent: {
              name: isDesc ? "desc" : "asc",
            },
          });
        } else if (fieldName === "agent-hostname") {
          orderBy.push({
            agent: {
              hostname: isDesc ? "desc" : "asc",
            },
          });
        } else if (fieldName === "agent-ip") {
          orderBy.push({
            agent: {
              ip_address: isDesc ? "desc" : "asc",
            },
          });
        } else {
          orderBy.push({
            [fieldName]: isDesc ? "desc" : "asc",
          });
        }
      });
    }
    const where: Prisma.AnomalyLogWhereInput[] = [];
    if (agentId) {
      where.push({
        agent_id: agentId,
      });
    }
    if (search) {
      where.push({
        OR: [
          { ip: { contains: search, mode: "insensitive" } },
          { risk_category: { contains: search, mode: "insensitive" } },
          { risk_reasons: { array_contains: search, mode: "insensitive" } },
        ],
      });
    }
    return await prisma.anomalyLog.findMany({
      where: {
        AND: where,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: true,
      },
    });
  }

  static async updateAnomaly(data: AnomalyUpdate) {
    return await prisma.anomalyLog.update({
      where: {
        id: data.id,
      },
      data,
    });
  }

  static async total(agentId?: string) {
    const where: Prisma.AnomalyLogWhereInput = {};

    if (agentId) {
      where.agent_id = agentId;
    }

    return await prisma.anomalyLog.count({
      where,
    });
  }

  static async countRiskCategory({
    riskCategory,
    agentId,
  }: {
    riskCategory: string;
    agentId?: string;
  }) {
    const where: Prisma.AnomalyLogWhereInput = {};
    if (agentId) {
      where.AND = [
        {
          agent_id: agentId,
        },
        {
          risk_category: riskCategory.toUpperCase(),
        },
      ];
    } else {
      where.risk_category = riskCategory.toUpperCase();
    }
    return await prisma.anomalyLog.count({
      where,
    });
  }

  static async getTop10SuspiciousIP() {
    // Try HIGH first, fallback to MEDIUM if none found
    const highResults = await prisma.anomalyLog.findMany({
      where: { risk_category: { equals: "HIGH", mode: "insensitive" } },
      orderBy: { risk_score: "desc" },
      take: 10,
      select: {
        ip: true,
        risk_score: true,
        risk_category: true,
        request_count: true,
        error_count: true,
        updated_at: true,
      },
    });
    if (highResults.length > 0) return highResults;

    return await prisma.anomalyLog.findMany({
      where: { risk_category: { equals: "MEDIUM", mode: "insensitive" } },
      orderBy: { risk_score: "desc" },
      take: 10,
      select: {
        ip: true,
        risk_score: true,
        risk_category: true,
        request_count: true,
        error_count: true,
        updated_at: true,
      },
    });
  }

  static async getDashboardStats() {
    const [totalLogs, activeAgents, totalAgents, highRiskIps] =
      await Promise.all([
        prisma.anomalyLog.count(),
        prisma.agent.count({ where: { status: "online" } }),
        prisma.agent.count(),
        prisma.anomalyLog.count({
          where: { risk_category: { equals: "HIGH", mode: "insensitive" } },
        }),
      ]);
    return { totalLogs, activeAgents, totalAgents, highRiskIps };
  }

  static async countHighriskIp() {
    return await prisma.anomalyLog.count({
      where: {
        risk_category: {
          in: ["high"],
        },
      },
    });
  }

  static async latestLogsReport() {
    return await prisma.anomalyLog.findMany({
      take: 10,
      orderBy: {
        created_at: "desc",
      },
      include: {
        agent: true,
      },
    });
  }
}
