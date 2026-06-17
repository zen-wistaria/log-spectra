"use server";

import type { AnomalyUpdate } from "@/schema/anomaly.schema";
import {
  AnomalyService,
  type GetAnomaliesParams,
} from "@/services/anomaly.service";
// import type { Agent, AnomalyLog } from "@prisma/client";
// import type { JsonArray, JsonValue } from "@prisma/client/runtime/client";

// type AgentSummary = {
//   id: string;
//   name: string;
//   hostname: string | null;
//   ip_address: string | null;
//   status: string;
// };

// export type GroupedAnomalyItem = {
//   ip: string;
//   agents: AgentSummary[];
//   risk_score: number;
//   risk_category: string;
//   risk_reasons: JsonValue;
//   request_count: number;
//   error_count: number;
//   request_per_second: number;
//   unique_endpoint_ratio: number;
//   resolved_mark: boolean;
//   resolved_at: Date | null;
//   resolved_notes: string | null;
//   created_at: Date;
//   updated_at: Date;
// };

// export type GroupedAnomalyData = Record<string, GroupedAnomalyItem>;

export async function getAnomlies(params: GetAnomaliesParams) {
  try {
    const data = await AnomalyService.getAnomalies(params);
    const total = await AnomalyService.total(params.agentId, false, params.ip);
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

export async function getResolvedAnomlies(params: GetAnomaliesParams) {
  try {
    const data = await AnomalyService.getAnomalies({
      ...params,
      markedAsResolved: true,
    });

    const total = await AnomalyService.total(params.agentId, true, params.ip);
    const pages = Math.ceil(total / params.limit);

    const highCount = await AnomalyService.countRiskCategory({
      riskCategory: "high",
      agentId: params.agentId,
      markedAsResolved: true,
    });
    const mediumCount = await AnomalyService.countRiskCategory({
      riskCategory: "medium",
      agentId: params.agentId,
      markedAsResolved: true,
    });
    const lowCount = await AnomalyService.countRiskCategory({
      riskCategory: "low",
      agentId: params.agentId,
      markedAsResolved: true,
    });

    // const mappedData = data.reduce<GroupedAnomalyData>((acc, cur) => {
    //   const ip = cur.ip;

    //   const newAgent: AgentSummary = {
    //     id: cur.agent.id,
    //     name: cur.agent.name,
    //     hostname: cur.agent.hostname,
    //     ip_address: cur.agent.ip_address,
    //     status: cur.agent.status,
    //   };

    //   if (!acc[ip]) {
    //     acc[ip] = {
    //       ip: ip,
    //       agents: [newAgent],
    //       risk_score: cur.risk_score,
    //       risk_category: cur.risk_category,
    //       risk_reasons: cur.risk_reasons,
    //       request_count: cur.request_count,
    //       error_count: cur.error_count,
    //       request_per_second: cur.request_per_second,
    //       unique_endpoint_ratio: cur.unique_endpoint_ratio,
    //       resolved_mark: cur.resolved_mark,
    //       resolved_at: cur.resolved_at,
    //       resolved_notes: cur.resolved_notes,
    //       created_at: cur.created_at,
    //       updated_at: cur.updated_at,
    //     };
    //   } else {
    //     const existingEntry = acc[ip];

    //     /* Check if agent already exists */
    //     const isAgentDuplicate = existingEntry.agents.some(
    //       (a) => a.id === newAgent.id,
    //     );

    //     if (!isAgentDuplicate) {
    //       existingEntry.agents.push(newAgent);
    //     }

    //     /* Compare Risk Score to determine "Winner Data" */
    //     if (cur.risk_score > existingEntry.risk_score) {
    //       existingEntry.risk_score = cur.risk_score;
    //       existingEntry.risk_category = cur.risk_category;
    //       existingEntry.risk_reasons = cur.risk_reasons;
    //       existingEntry.request_count = cur.request_count;
    //       existingEntry.error_count = cur.error_count;
    //       existingEntry.request_per_second = cur.request_per_second;
    //       existingEntry.unique_endpoint_ratio = cur.unique_endpoint_ratio;
    //       existingEntry.resolved_mark = cur.resolved_mark;
    //       existingEntry.resolved_at = cur.resolved_at;
    //       existingEntry.resolved_notes = cur.resolved_notes;
    //       existingEntry.created_at = cur.created_at;
    //       existingEntry.updated_at = cur.updated_at;
    //     }
    //   }

    //   return acc;
    // }, {});

    // const resultArray: GroupedAnomalyItem[] = Object.values(mappedData);
    // resultArray.sort((a, b) => b.risk_score - a.risk_score);

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

export async function updateAnomalyResolved(data: AnomalyUpdate) {
  try {
    if (data.agents) {
      await Promise.all(
        data.agents.map((agent) =>
          AnomalyService.updateAnomalyResolved({
            ...data,
            agent_id: agent.id,
          }),
        ),
      );
    }
  } catch {
    throw new Error("Cannot update data");
  }
}

export async function getAgentFromAnomalyIps(ip: string) {
  try {
    return await AnomalyService.getAgentFromAnomalyIps({ ip });
  } catch {
    throw new Error("Cannot get data");
  }
}
