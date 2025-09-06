import { ResearchDetailView } from "@/features/research/components/ResearchDetailView";

interface ResearchPageProps {
  params: {
    id: string;
  };
}

export default function ResearchPage({ params }: ResearchPageProps) {
  return <ResearchDetailView id={params.id} />;
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
