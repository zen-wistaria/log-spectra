"use server";

import {
  AnomalyService,
  type GetAnomaliesParams,
} from "@/services/anomaly.service";

export async function getAnomlies(params: GetAnomaliesParams) {
  try {
    const data = await AnomalyService.getAnomalies(params);
    const total = await AnomalyService.total(params.agentId);
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
