import { dehydrate, QueryClient } from '@tanstack/react-query';
import { getQueryClient } from './serverQueryClient';
import { 
  getResearchHistory, 
  getGetResearchHistoryQueryKey,
  getResearch,
  getGetResearchQueryKey 
} from '../api/generated';

/**
 * Prefetch research history on server
 */
export async function prefetchResearchHistory() {
  const queryClient = getQueryClient();
  
  await queryClient.prefetchQuery({
    queryKey: getGetResearchHistoryQueryKey(),
    queryFn: () => getResearchHistory(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return dehydrate(queryClient);
}

/**
 * Prefetch specific research by ID on server
 */
export async function prefetchResearch(id: string) {
  const queryClient = getQueryClient();
  
  // Prefetch research history
  await queryClient.prefetchQuery({
    queryKey: getGetResearchHistoryQueryKey(),
    queryFn: () => getResearchHistory(),
    staleTime: 1000 * 60 * 5,
  });

  // Prefetch specific research
  await queryClient.prefetchQuery({
    queryKey: getGetResearchQueryKey(id),
    queryFn: () => getResearch(id),
    staleTime: 1000 * 60 * 5,
  });

  return dehydrate(queryClient);
}

/**
 * Generic prefetch utility
 */
export async function prefetchQueries<T>(
  prefetchFn: (queryClient: QueryClient) => Promise<T>
) {
  const queryClient = getQueryClient();
  await prefetchFn(queryClient);
  return dehydrate(queryClient);
}

/**
 * Example: Prefetch multiple queries
 */
export async function prefetchHomePageData() {
  const queryClient = getQueryClient();
  
  // Prefetch research history
  await queryClient.prefetchQuery({
    queryKey: getGetResearchHistoryQueryKey(),
    queryFn: () => getResearchHistory(),
    staleTime: 1000 * 60 * 5,
  });

  // You can add more prefetch calls here for other data needed on home page
  
  return dehydrate(queryClient);
}