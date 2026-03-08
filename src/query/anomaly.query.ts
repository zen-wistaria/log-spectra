import { useQuery } from "@tanstack/react-query";
import { getAnomlies } from "@/actions/log-analysis";
import type { GetAnomaliesParams } from "@/services/anomaly.service";

export const useAnomalies = (params: GetAnomaliesParams) => {
  const queryKey = ["anomalies", params];
  return useQuery({
    queryKey,
    queryFn: () => {
      return getAnomlies(params);
    },
    enabled: !!params,
  });
};
