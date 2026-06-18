import { useQuery } from "@tanstack/react-query";
import { checkAbuseIpDb } from "@/actions/ip-intelligence";

export const useAbuseIpDbCheck = (ip: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["abuseipdb", ip],
    queryFn: () => checkAbuseIpDb(ip),
    enabled: !!ip && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour — AbuseIPDB data doesn't change frequently
    retry: 1,
  });
};
