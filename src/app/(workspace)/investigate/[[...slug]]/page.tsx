import { Unavailable } from "@/components/ui/States";

export const metadata = { title: "Investigate · TRACE" };

export default function InvestigatePage() {
  return <Unavailable title="Investigate" lede="Each investigation is TRACE working through the logs and the code one visible step at a time." needs="the graph database (Neo4j), log ingestion and the language model key" />;
}
