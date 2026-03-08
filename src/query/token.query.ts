import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createToken,
  deleteToken,
  getToken,
  revokeToken,
  updateToken,
} from "@/actions/token";
import type { GetTokenParams } from "@/services/token.service";

export const useTokens = (params: GetTokenParams) => {
  const queryKey = ["tokens", params];
  return useQuery({
    queryKey,
    queryFn: () => {
      return getToken(params);
    },
    enabled: !!params,
  });
};

export const useCreateToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createToken,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tokens"],
      });
      toast.success("Token created successfully");
    },
    onError: () => {
      toast.error("Failed to create token");
    },
  });
};

export const useUpdateToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateToken,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tokens"],
      });
      toast.success("Token updated successfully");
    },
    onError: () => {
      toast.error("Failed to update token");
    },
  });
};

export const useRevokeToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeToken,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tokens"],
      });
      toast.success("Token revoked successfully");
    },
    onError: () => {
      toast.error("Failed to revoke token");
    },
  });
};

export const useDeleteToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteToken,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tokens"],
      });
      toast.success("Token deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete token");
    },
  });
};
