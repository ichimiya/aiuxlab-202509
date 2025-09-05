import { ResearchInterface } from '@/features/research/components/ResearchInterface';
import { ResearchVisualization } from '@/features/visualization/components/ResearchVisualization';
import { HydrationBoundary } from '@/shared/components/HydrationBoundary';
import { prefetchHomePageData } from '@/shared/lib/prefetchHelpers';

export default async function Home() {
  // Server-side data prefetching
  const dehydratedState = await prefetchHomePageData();

  return (
    <HydrationBoundary dehydratedState={dehydratedState}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Research Interface */}
        <div className="space-y-6">
          <ResearchInterface />
        </div>
        
        {/* 3D Visualization */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">リサーチ可視化</h2>
          <ResearchVisualization />
        </div>
      </div>
    </HydrationBoundary>
  );
}
