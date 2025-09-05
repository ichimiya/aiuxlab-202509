import { HydrationBoundary } from "@/shared/components/HydrationBoundary";
import { prefetchResearch } from "@/shared/lib/prefetchHelpers";
import { ResearchDetailView } from "@/features/research/components/ResearchDetailView";

interface ResearchPageProps {
  params: {
    id: string;
  };
}

export default async function ResearchPage({ params }: ResearchPageProps) {
  // Server-side prefetch for specific research
  const dehydratedState = await prefetchResearch(params.id);

  return (
    <HydrationBoundary dehydratedState={dehydratedState}>
      <ResearchDetailView id={params.id} />
    </HydrationBoundary>
  );
}

// Optional: Generate static params for SSG
export async function generateStaticParams() {
  // This would fetch list of research IDs for static generation
  // For now, return empty array to use ISR/SSR
  return [];
}

// Optional: Metadata generation
export async function generateMetadata({ params }: ResearchPageProps) {
  return {
    title: `Research ${params.id} - AI Research POC`,
    description: `Detailed view of research ${params.id}`,
  };
}
