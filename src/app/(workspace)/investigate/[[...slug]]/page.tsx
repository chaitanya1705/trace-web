import { InvestigationView } from "@/features/investigate/InvestigationView";
import { Investigations } from "@/features/investigate/Investigations";

export const metadata = { title: "Investigate · TRACE" };

export default async function InvestigatePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (slug && slug.length >= 2) return <InvestigationView projectId={slug[0]} runId={slug[1]} />;
  return <Investigations />;
}
