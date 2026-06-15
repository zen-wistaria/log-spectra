import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { TokenCreate, TokenUpdate } from "@/schema/token.schema";

export interface GetTokenParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
  agentId?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: using for agent services
export class TokenService {
  static async getTokens({
    page,
    limit,
    search,
    sort,
    agentId,
  }: GetTokenParams) {
    const orderBy: Prisma.ApiTokensOrderByWithRelationInput[] = [];
    if (sort) {
      const fields = sort.split(",");
      fields.forEach((field) => {
        const isDesc = field.startsWith("-");
        const fieldName = isDesc ? field.substring(1) : field;

        orderBy.push({
          [fieldName]: isDesc ? "desc" : "asc",
        });
      });
    }
    const where: Prisma.ApiTokensWhereInput[] = [];

    if (agentId) {
      where.push({
        agent_id: agentId,
      });
    }

    if (search) {
      where.push({
        OR: [
          {
            token: { contains: search, mode: "insensitive" },
          },
        ],
      });
    }
    return await prisma.apiTokens.findMany({
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

  static async createToken(data: TokenCreate) {
    // const generatedToken = `tk_${crypto.randomUUID().replace(/-/g, "")}`;
    const length = 50;
    const generatedToken = `tk_${crypto
      .randomBytes(length / 2)
      .toString("hex")
      .slice(0, length)}`;
    return await prisma.apiTokens.create({
      data: {
        ...data,
        token: generatedToken,
      },
    });
  }

  static async updateToken(data: TokenUpdate) {
    return await prisma.apiTokens.update({
      where: {
        id: data.id,
      },
      data,
    });
  }

  static async revokeToken(id: number) {
    return await prisma.apiTokens.update({
      where: { id },
      data: {
        is_active: false,
      },
    });
  }

  static async deleteToken(id: number) {
    return await prisma.apiTokens.delete({
      where: { id },
    });
  }

  static async total(agentId?: string) {
    return await prisma.apiTokens.count({
      where: {
        agent_id: agentId,
      },
    });
  }
}
