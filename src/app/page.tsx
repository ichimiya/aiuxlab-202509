import { ResearchInterface } from '@/features/research/components/research-interface';
import { ResearchVisualization } from '@/features/visualization/components/research-visualization';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
