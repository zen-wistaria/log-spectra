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
    const highCount = await AnomalyService.countRiskCategory({
      riskCategory: "high",
      agentId: params.agentId,
    });
    const mediumCount = await AnomalyService.countRiskCategory({
      riskCategory: "medium",
      agentId: params.agentId,
    });
    const lowCount = await AnomalyService.countRiskCategory({
      riskCategory: "low",
      agentId: params.agentId,
    });

    return {
      data,
      total,
      pages,
      highCount,
      mediumCount,
      lowCount,
    };
  } catch {
    throw new Error("Cannot get data");
  }
}
