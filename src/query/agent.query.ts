import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAgent,
  deleteAgent,
  getAgentById,
  getAgents,
  updateAgent,
} from "@/actions/agent";
import type { GetAgentsParams } from "@/services/agent.service";

export const useAgents = (params: GetAgentsParams) => {
  const queryKey = ["agents", params];
  return useQuery({
    queryKey,
    queryFn: () => {
      return getAgents(params);
    },
    enabled: !!params,
  });
};

export const useAgentById = (id: string) => {
  const queryKey = ["agent", id];
  return useQuery({
    queryKey,
    queryFn: () => {
      return getAgentById(id);
    },
    enabled: !!id,
  });
};

export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agents"],
      });
      toast.success("Agent created successfully");
    },
    onError: () => {
      toast.error("Failed to create agent");
    },
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agents"],
      });
      toast.success("Agent updated successfully");
    },
    onError: () => {
      toast.error("Failed to update agent");
    },
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agents"],
      });
      toast.success("Agent deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete agent");
    },
  });
};
