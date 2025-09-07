import { useMutation } from "@tanstack/react-query";
import { optimizeQuery } from "@/shared/api/generated/api";
import type {
  QueryOptimizationRequest,
  OptimizationResult,
} from "@/shared/api/generated/models";

export function useQueryOptimization() {
  const mutation = useMutation<
    OptimizationResult,
    unknown,
    QueryOptimizationRequest
  >({
    mutationKey: ["optimizeQuery"],
    mutationFn: (data) => optimizeQuery(data),
  });

  return {
    optimize: (data: QueryOptimizationRequest) => mutation.mutateAsync(data),
    ...mutation,
  };
}
