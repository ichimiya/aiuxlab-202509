import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

// Server-side QueryClient factory
// Use React's cache to ensure single instance per request
export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: {
    queries: {
      // Server-side specific options
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: false, // Don't retry on server
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false, // Don't retry mutations on server
    },
  },
}));

// Alternative: Create new instance each time (for isolation)
export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: false, // Don't retry on server
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});