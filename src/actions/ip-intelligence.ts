"use server";

import {
  type AbuseIpDbResult,
  lookupAbuseIpDb,
  type ReportAbuseIpDbParams,
  reportAbuseIpDb,
} from "@/services/ip-intelligence.service";

export async function checkAbuseIpDb(
  ip: string,
): Promise<AbuseIpDbResult | null> {
  return lookupAbuseIpDb(ip);
}

export async function reportAbuseIpDbAction(params: ReportAbuseIpDbParams) {
  return reportAbuseIpDb(params);
}
