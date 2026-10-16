import { Unavailable } from "@/components/ui/States";

export const metadata = { title: "Observability · TRACE" };

export default function ObservabilityPage() {
  return <Unavailable title="Observability" lede="After a change is merged and deployed, TRACE watches the same logs to confirm recovery." needs="deployment tracking and log ingestion" />;
}
