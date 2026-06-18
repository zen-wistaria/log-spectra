import { useMutation, useQuery } from "@tanstack/react-query";
import {
  checkAbuseIpDb,
  reportAbuseIpDbAction,
} from "@/actions/ip-intelligence";
import type { ReportAbuseIpDbParams } from "@/services/ip-intelligence.service";

export const useAbuseIpDbCheck = (ip: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["abuseipdb", ip],
    queryFn: () => checkAbuseIpDb(ip),
    enabled: !!ip && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour — AbuseIPDB data doesn't change frequently
    retry: 1,
  });
};

export const useReportAbuseIpDb = () => {
  return useMutation({
    mutationFn: (params: ReportAbuseIpDbParams) =>
      reportAbuseIpDbAction(params),
  });
};
