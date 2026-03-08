import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AnomalyCreate, AnomalyUpdate } from "@/schema/anomaly.schema";

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
    return await prisma.anomalyLog.count({
      where: {
        agent_id: agentId,
      },
    });
  }
}
