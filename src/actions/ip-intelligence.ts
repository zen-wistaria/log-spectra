"use server";

import {
  type AbuseIpDbResult,
  lookupAbuseIpDb,
} from "@/services/ip-intelligence.service";

export async function checkAbuseIpDb(
  ip: string,
): Promise<AbuseIpDbResult | null> {
  return lookupAbuseIpDb(ip);
}
