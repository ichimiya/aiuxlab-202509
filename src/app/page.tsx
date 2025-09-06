import { ResearchInterface } from "@/features/research/components/ResearchInterface";

export default function Home() {
  return (
    <div className="grid gap-8">
      {/* Research Interface */}
      <div className="space-y-6">
        <ResearchInterface />
      </div>
    </div>
  );
}
