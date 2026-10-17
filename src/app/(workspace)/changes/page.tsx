import { Unavailable } from "@/components/ui/States";

export const metadata = { title: "Changes & PRs · TRACE" };

export default function ChangesPage() {
  return <Unavailable title="Changes & PRs" lede="Fixes that investigations propose, each needing approval before TRACE opens a draft pull request." needs="the investigator, which proposes the fixes" />;
}
