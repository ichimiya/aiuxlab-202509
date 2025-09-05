'use client';

import { QueryClient, HydrationBoundary as RQHydrationBoundary, dehydrate } from '@tanstack/react-query';
import { ReactNode } from 'react';

interface HydrationBoundaryProps {
  children: ReactNode;
  dehydratedState?: ReturnType<typeof dehydrate>;
}

/**
 * Client-side hydration boundary for React Query
 * Hydrates server-side prefetched data into the client-side query cache
 */
export function HydrationBoundary({ children, dehydratedState }: HydrationBoundaryProps) {
  return (
    <RQHydrationBoundary state={dehydratedState}>
      {children}
    </RQHydrationBoundary>
  );
}