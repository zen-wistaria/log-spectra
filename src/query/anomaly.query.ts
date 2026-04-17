import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAgentFromAnomalyIps,
  getAnomlies,
  getResolvedAnomlies,
  updateAnomalyResolved,
} from "@/actions/anomalies";
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

export const useResolvedAnomalies = (params: GetAnomaliesParams) => {
  const queryKey = ["resolved-anomalies", params];
  return useQuery({
    queryKey,
    queryFn: () => {
      return getResolvedAnomlies(params);
    },
    enabled: !!params,
  });
};

export const useGetAgentFromAnomalyIps = ({
  ip,
  fetch,
}: {
  ip: string;
  fetch?: boolean;
}) => {
  const queryKey = ["agent-from-anomaly-ips", ip];
  return useQuery({
    queryKey,
    queryFn: () => {
      return getAgentFromAnomalyIps(ip);
    },
    enabled: !!ip && (fetch ?? true),
  });
};

export const useUpdateAnomalyResolved = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAnomalyResolved,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["anomalies"],
      });
      queryClient.invalidateQueries({
        queryKey: ["resolved-anomalies"],
      });
      toast.success("Logs marked as resolved");
    },
    onError: () => {
      toast.error("Failed to mark logs as resolved");
    },
  });
};
