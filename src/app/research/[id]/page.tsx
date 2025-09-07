import { ResearchDetailView } from "@/features/research/components/ResearchDetailView";

// Next.js 15 の PageProps 仕様に合わせて params を Promise 化
interface ResearchPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResearchPage({ params }: ResearchPageProps) {
  const { id } = await params;
  return <ResearchDetailView id={id} />;
}

// Optional: Generate static params for SSG
export async function generateStaticParams() {
  // This would fetch list of research IDs for static generation
  // For now, return empty array to use ISR/SSR
  return [];
}

// Optional: Metadata generation
export async function generateMetadata({ params }: ResearchPageProps) {
  const { id } = await params;
  return {
    title: `Research ${id} - AI Research POC`,
    description: `Detailed view of research ${id}`,
  };
}
