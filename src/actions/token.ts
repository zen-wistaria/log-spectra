"use server";

import type { TokenCreate, TokenUpdate } from "@/schema/token.schema";
import { type GetTokenParams, TokenService } from "@/services/token.service";

export async function getToken(params: GetTokenParams) {
  try {
    const data = await TokenService.getTokens(params);
    const total = await TokenService.total(params.agentId);
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

export async function createToken(data: TokenCreate) {
  return TokenService.createToken(data);
}

export async function updateToken(data: TokenUpdate) {
  return TokenService.updateToken(data);
}
export async function revokeToken(id: number) {
  return TokenService.revokeToken(id);
}

export async function deleteToken(id: number) {
  return TokenService.deleteToken(id);
}
