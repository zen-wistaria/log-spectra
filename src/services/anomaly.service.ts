import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AnomalyUpdate } from "@/schema/anomaly.schema";

export interface GetAnomaliesParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
  agentId?: string;
  markedAsResolved?: boolean;
}

// biome-ignore lint/complexity/noStaticOnlyClass: using for agent services
export class AnomalyService {
  static async getAnomalies({
    page,
    limit,
    search,
    sort,
    markedAsResolved = false,
    agentId,
  }: GetAnomaliesParams) {
    const orderBy: Prisma.AnomalyLogsOrderByWithRelationInput[] = [];
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
    const where: Prisma.AnomalyLogsWhereInput[] = [];
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
    if (markedAsResolved) {
      where.push({
        resolved_mark: true,
      });
    } else {
      where.push({
        resolved_mark: false,
      });
    }
    return await prisma.anomalyLogs.findMany({
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

  static async updateAnomalyResolved(data: AnomalyUpdate) {
    return await prisma.anomalyLogs.update({
      where: {
        agent_id_ip: {
          agent_id: data.agent_id,
          ip: data.ip,
        },
      },
      data: {
        resolved_mark: data.resolved_mark,
        resolved_at: data.resolved_at,
        resolved_notes: data.resolved_notes,
      },
    });
  }

  static async total(agentId?: string, markedAsResolved: boolean = false) {
    const where: Prisma.AnomalyLogsWhereInput = {};

    if (agentId) {
      where.agent_id = agentId;
    }
    if (markedAsResolved) {
      where.resolved_mark = true;
    } else {
      where.resolved_mark = false;
    }

    return await prisma.anomalyLogs.count({
      where,
    });
  }

  static async countRiskCategory({
    riskCategory,
    agentId,
    markedAsResolved = false,
  }: {
    riskCategory: string;
    agentId?: string;
    markedAsResolved?: boolean;
  }) {
    const where: Prisma.AnomalyLogsWhereInput = {};
    if (agentId) {
      where.AND = [
        {
          agent_id: agentId,
        },
        {
          risk_category: riskCategory.toUpperCase(),
        },
        {
          resolved_mark: markedAsResolved,
        },
      ];
    } else {
      where.risk_category = riskCategory.toUpperCase();
      where.resolved_mark = markedAsResolved;
    }
    return await prisma.anomalyLogs.count({
      where,
    });
  }

  static async getTop10SuspiciousIP() {
    // Try HIGH first, fallback to MEDIUM if none found
    const highResults = await prisma.anomalyLogs.findMany({
      where: {
        risk_category: { equals: "HIGH", mode: "insensitive" },
        resolved_mark: false,
      },
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

    return await prisma.anomalyLogs.findMany({
      where: {
        risk_category: { equals: "MEDIUM", mode: "insensitive" },
        resolved_mark: false,
      },
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
    const [agentStats, anomalyStats] = await Promise.all([
      prisma.agents
        .aggregate({
          _count: {
            _all: true,
          },
          where: {},
        })
        .then(async (res) => {
          const active = await prisma.agents.count({
            where: { status: "online" },
          });

          return {
            totalAgents: res._count._all,
            activeAgents: active,
          };
        }),

      prisma.anomalyLogs.groupBy({
        by: ["resolved_mark", "risk_category"],
        _count: {
          _all: true,
        },
      }),
    ]);

    let totalLogs = 0;
    let highRiskIps = 0;
    let totalMarkedAsResolved = 0;

    for (const row of anomalyStats) {
      totalLogs += row._count._all;

      if (
        row.risk_category?.toLowerCase() === "high" &&
        row.resolved_mark === false
      ) {
        highRiskIps += row._count._all;
      }

      if (row.resolved_mark === true) {
        totalMarkedAsResolved += row._count._all;
      }
    }

    return {
      totalLogs,
      activeAgents: agentStats.activeAgents,
      totalAgents: agentStats.totalAgents,
      highRiskIps,
      totalMarkedAsResolved,
    };
  }

  static async countHighriskIp() {
    return await prisma.anomalyLogs.count({
      where: {
        risk_category: {
          in: ["high"],
        },
        resolved_mark: false,
      },
    });
  }

  static async latestLogsReport() {
    return await prisma.anomalyLogs.findMany({
      take: 10,
      orderBy: {
        created_at: "desc",
      },
      include: {
        agent: true,
      },
    });
  }

  static async getAgentFromAnomalyIps({ ip }: { ip: string }) {
    return await prisma.anomalyLogs.findMany({
      where: {
        ip,
      },
      select: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
