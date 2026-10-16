import { Unavailable } from "@/components/ui/States";

export const metadata = { title: "Change · TRACE" };

export default function FixPage() {
  return <Unavailable title="Change" lede="A proposed fix with its diff, approvals and pull request." needs="the investigator and the change workflow" />;
}
